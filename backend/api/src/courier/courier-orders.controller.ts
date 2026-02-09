import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { IsString, IsOptional } from 'class-validator';
import { PrismaService } from 'prisma/prisma.service';
import { CourierJwtGuard } from './courier-jwt.guard';
import { EventsService } from '../events/events.service';

interface CourierRequest {
  user: {
    sub: string;
    login: string;
    fullName: string;
    role: string;
  };
}

class CancelOrderDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

@Controller('v1/courier/orders')
@UseGuards(CourierJwtGuard)
export class CourierOrdersController {
  constructor(
    private prisma: PrismaService,
    private eventsService: EventsService,
  ) {}

  // Получить заказы, назначенные курьеру
  @Get()
  async getMyOrders(@Req() req: CourierRequest) {
    const courierId = req.user.sub;

    const orders = await this.prisma.order.findMany({
      where: {
        courierId,
        status: {
          in: ['ASSIGNED_TO_COURIER', 'ACCEPTED_BY_COURIER', 'ON_THE_WAY'],
        },
      },
      include: {
        items: {
          include: {
            product: {
              select: { id: true, title: true, imageUrl: true },
            },
          },
        },
        user: {
          select: { id: true, name: true, phone: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return { data: orders };
  }

  // Получить историю доставленных заказов
  @Get('history')
  async getOrdersHistory(@Req() req: CourierRequest) {
    const courierId = req.user.sub;

    const orders = await this.prisma.order.findMany({
      where: {
        courierId,
        status: {
          in: ['DELIVERED', 'CANCELED'],
        },
      },
      include: {
        items: {
          include: {
            product: {
              select: { id: true, title: true },
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    });

    return { data: orders };
  }

  // Курьер берёт заказ (статус → ACCEPTED_BY_COURIER)
  @Patch(':id/accept')
  async acceptOrder(@Param('id') orderId: string, @Req() req: CourierRequest) {
    const courierId = req.user.sub;
    const courierName = req.user.fullName;

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new BadRequestException('Заказ не найден');
    }

    if (order.courierId !== courierId) {
      throw new BadRequestException('Этот заказ назначен другому курьеру');
    }

    if (order.status !== 'ASSIGNED_TO_COURIER') {
      throw new BadRequestException('Заказ уже принят или недоступен');
    }

    // Обновляем заказ и статус курьера
    const [updatedOrder] = await this.prisma.$transaction([
      this.prisma.order.update({
        where: { id: orderId },
        data: { status: 'ACCEPTED_BY_COURIER' },
      }),
      this.prisma.orderStatusHistory.create({
        data: {
          orderId,
          status: 'ACCEPTED_BY_COURIER',
          comment: 'Курьер принял заказ',
          changedBy: `Курьер: ${courierName}`,
        },
      }),
      this.prisma.courier.update({
        where: { id: courierId },
        data: { status: 'ACCEPTED' },
      }),
    ]);

    // Отправляем SSE событие
    this.eventsService.emitOrderEvent({
      type: 'ORDER_UPDATED',
      order: {
        id: updatedOrder.id,
        orderNumber: updatedOrder.orderNumber,
        customerName: updatedOrder.customerName,
        phone: updatedOrder.phone,
        totalAmount: updatedOrder.totalAmount,
        status: updatedOrder.status,
        createdAt: updatedOrder.createdAt,
      },
      userId: updatedOrder.userId,
    });

    return { success: true, order: updatedOrder };
  }

  // Курьер выезжает с заказами (все ACCEPTED_BY_COURIER → ON_THE_WAY)
  @Patch('start-delivery')
  async startDelivery(@Req() req: CourierRequest) {
    const courierId = req.user.sub;
    const courierName = req.user.fullName;

    // Находим все принятые заказы курьера
    const acceptedOrders = await this.prisma.order.findMany({
      where: {
        courierId,
        status: 'ACCEPTED_BY_COURIER',
      },
    });

    if (acceptedOrders.length === 0) {
      throw new BadRequestException('Нет принятых заказов для доставки');
    }

    // Обновляем все заказы и статус курьера
    await this.prisma.$transaction(async (tx) => {
      // Обновляем статус всех принятых заказов
      for (const order of acceptedOrders) {
        await tx.order.update({
          where: { id: order.id },
          data: { status: 'ON_THE_WAY' },
        });

        await tx.orderStatusHistory.create({
          data: {
            orderId: order.id,
            status: 'ON_THE_WAY',
            comment: 'Курьер выехал',
            changedBy: `Курьер: ${courierName}`,
          },
        });

        // Отправляем SSE событие для каждого заказа
        this.eventsService.emitOrderEvent({
          type: 'ORDER_UPDATED',
          order: {
            id: order.id,
            orderNumber: order.orderNumber,
            customerName: order.customerName,
            phone: order.phone,
            totalAmount: order.totalAmount,
            status: 'ON_THE_WAY',
            createdAt: order.createdAt,
          },
          userId: order.userId,
        });
      }

      // Обновляем статус курьера на "Везу заказы"
      await tx.courier.update({
        where: { id: courierId },
        data: { status: 'DELIVERING' },
      });
    });

    return {
      success: true,
      message: `Выехали с ${acceptedOrders.length} заказами`,
      count: acceptedOrders.length,
    };
  }

  // Курьер доставил заказ
  @Patch(':id/deliver')
  async deliverOrder(@Param('id') orderId: string, @Req() req: CourierRequest) {
    const courierId = req.user.sub;
    const courierName = req.user.fullName;

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new BadRequestException('Заказ не найден');
    }

    if (order.courierId !== courierId) {
      throw new BadRequestException('Этот заказ назначен другому курьеру');
    }

    if (order.status !== 'ON_THE_WAY') {
      throw new BadRequestException('Заказ не в статусе "В пути"');
    }

    // Обновляем заказ
    const updatedOrder = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({
        where: { id: orderId },
        data: { status: 'DELIVERED' },
        include: { items: true },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId,
          status: 'DELIVERED',
          comment: 'Заказ доставлен',
          changedBy: `Курьер: ${courierName}`,
        },
      });

      // Списываем товар со склада по FIFO-партиям
      const affectedProductIds: string[] = [];
      for (const item of updated.items) {
        // Уменьшаем общий остаток товара
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.qty } },
        });

        // FIFO-списание из партий: находим активные партии по сроку годности
        let remaining = item.qty;
        const fifoBatches = await tx.batch.findMany({
          where: {
            productId: item.productId,
            status: 'ACTIVE',
            remainingQty: { gt: 0 },
          },
          orderBy: [{ expiryDate: 'asc' }, { createdAt: 'asc' }],
        });

        for (const batch of fifoBatches) {
          if (remaining <= 0) break;
          const deduct = Math.min(remaining, batch.remainingQty);
          const updatedBatch = await tx.batch.update({
            where: { id: batch.id },
            data: { remainingQty: { decrement: deduct } },
          });
          if (updatedBatch.remainingQty <= 0) {
            await tx.batch.update({
              where: { id: batch.id },
              data: { status: 'SOLD_OUT' },
            });
          }
          remaining -= deduct;
        }

        if (!affectedProductIds.includes(item.productId)) {
          affectedProductIds.push(item.productId);
        }
      }

      // Пересчитываем цену товара по активной партии (FIFO)
      for (const productId of affectedProductIds) {
        const activeBatch = await tx.batch.findFirst({
          where: { productId, status: 'ACTIVE', remainingQty: { gt: 0 } },
          orderBy: [{ expiryDate: 'asc' }, { createdAt: 'asc' }],
        });
        if (activeBatch && activeBatch.sellingPrice > 0) {
          let effectivePrice = activeBatch.sellingPrice;
          let oldPriceVal: number | null = null;
          if (activeBatch.discountPercent > 0) {
            effectivePrice = Math.round(
              activeBatch.sellingPrice * (1 - activeBatch.discountPercent / 100),
            );
            oldPriceVal = activeBatch.sellingPrice;
          }
          await tx.product.update({
            where: { id: productId },
            data: { price: effectivePrice, oldPrice: oldPriceVal },
          });
        }
      }

      // Проверяем, остались ли ещё заказы в доставке
      const remainingOrders = await tx.order.count({
        where: {
          courierId,
          status: { in: ['ACCEPTED_BY_COURIER', 'ON_THE_WAY'] },
        },
      });

      // Если заказов больше нет, освобождаем курьера
      if (remainingOrders === 0) {
        await tx.courier.update({
          where: { id: courierId },
          data: { status: 'AVAILABLE' },
        });
      }

      return updated;
    });

    // Отправляем SSE событие
    this.eventsService.emitOrderEvent({
      type: 'ORDER_UPDATED',
      order: {
        id: updatedOrder.id,
        orderNumber: updatedOrder.orderNumber,
        customerName: updatedOrder.customerName,
        phone: updatedOrder.phone,
        totalAmount: updatedOrder.totalAmount,
        status: updatedOrder.status,
        createdAt: updatedOrder.createdAt,
      },
      userId: updatedOrder.userId,
    });

    return { success: true, order: updatedOrder };
  }

  // Курьер отменяет заказ
  @Patch(':id/cancel')
  async cancelOrder(
    @Param('id') orderId: string,
    @Body() dto: CancelOrderDto,
    @Req() req: CourierRequest,
  ) {
    const courierId = req.user.sub;
    const courierName = req.user.fullName;

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new BadRequestException('Заказ не найден');
    }

    if (order.courierId !== courierId) {
      throw new BadRequestException('Этот заказ назначен другому курьеру');
    }

    if (
      !['ASSIGNED_TO_COURIER', 'ACCEPTED_BY_COURIER', 'ON_THE_WAY'].includes(
        order.status,
      )
    ) {
      throw new BadRequestException(
        'Невозможно отменить заказ в текущем статусе',
      );
    }

    // Обновляем заказ
    const updatedOrder = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({
        where: { id: orderId },
        data: {
          status: 'CANCELED',
          canceledBy: 'COURIER',
          cancelReason: dto.reason || 'Отменено курьером',
          courierId: null, // Снимаем назначение
        },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId,
          status: 'CANCELED',
          comment: dto.reason || 'Отменено курьером',
          changedBy: `Курьер: ${courierName}`,
        },
      });

      // Проверяем, остались ли ещё заказы
      const remainingOrders = await tx.order.count({
        where: {
          courierId,
          status: {
            in: ['ASSIGNED_TO_COURIER', 'ACCEPTED_BY_COURIER', 'ON_THE_WAY'],
          },
        },
      });

      // Если заказов больше нет, освобождаем курьера
      if (remainingOrders === 0) {
        await tx.courier.update({
          where: { id: courierId },
          data: { status: 'AVAILABLE' },
        });
      }

      return updated;
    });

    // Отправляем SSE событие
    this.eventsService.emitOrderEvent({
      type: 'ORDER_UPDATED',
      order: {
        id: updatedOrder.id,
        orderNumber: updatedOrder.orderNumber,
        customerName: updatedOrder.customerName,
        phone: updatedOrder.phone,
        totalAmount: updatedOrder.totalAmount,
        status: updatedOrder.status,
        createdAt: updatedOrder.createdAt,
      },
      userId: updatedOrder.userId,
    });

    return { success: true, order: updatedOrder };
  }

  // Получить текущий статус курьера
  @Get('status')
  async getStatus(@Req() req: CourierRequest) {
    const courierId = req.user.sub;

    const courier = await this.prisma.courier.findUnique({
      where: { id: courierId },
      select: {
        id: true,
        fullName: true,
        status: true,
        _count: {
          select: {
            orders: {
              where: {
                status: {
                  in: [
                    'ASSIGNED_TO_COURIER',
                    'ACCEPTED_BY_COURIER',
                    'ON_THE_WAY',
                  ],
                },
              },
            },
          },
        },
      },
    });

    if (!courier) {
      throw new BadRequestException('Курьер не найден');
    }

    return {
      status: courier.status,
      activeOrdersCount: courier._count.orders,
    };
  }

  // Переключить статус курьера (Не работаю <-> Свободен)
  @Patch('toggle-availability')
  async toggleAvailability(@Req() req: CourierRequest) {
    const courierId = req.user.sub;

    const courier = await this.prisma.courier.findUnique({
      where: { id: courierId },
      select: { status: true },
    });

    if (!courier) {
      throw new BadRequestException('Курьер не найден');
    }

    // Можно переключаться только между OFF_DUTY и AVAILABLE
    // Если курьер ACCEPTED или DELIVERING - нельзя перейти в OFF_DUTY
    const currentStatus = courier.status as string;
    if (currentStatus === 'ACCEPTED' || currentStatus === 'DELIVERING') {
      throw new BadRequestException(
        'Нельзя выключить режим работы пока есть активные заказы. Сначала завершите все доставки.',
      );
    }

    const newStatus = currentStatus === 'OFF_DUTY' ? 'AVAILABLE' : 'OFF_DUTY';

    // Используем $executeRaw для обновления статуса, т.к. OFF_DUTY может быть ещё не в Prisma Client
    await this.prisma
      .$executeRaw`UPDATE "Courier" SET "status" = ${newStatus}::"CourierStatus" WHERE "id" = ${courierId}`;

    const updated = await this.prisma.courier.findUnique({
      where: { id: courierId },
      select: { status: true },
    });

    return {
      success: true,
      status: updated?.status ?? newStatus,
      message:
        newStatus === 'AVAILABLE'
          ? 'Вы начали рабочий день. Теперь вам могут назначать заказы.'
          : 'Вы завершили рабочий день. Новые заказы поступать не будут.',
    };
  }

  // Получить статистику профиля курьера (заработок, доставки)
  @Get('profile-stats')
  async getProfileStats(@Req() req: CourierRequest) {
    const courierId = req.user.sub;

    const courier = await this.prisma.courier.findUnique({
      where: { id: courierId },
      select: { deliveryRate: true },
    });

    if (!courier) {
      throw new BadRequestException('Курьер не найден');
    }

    // Даты для фильтрации
    const now = new Date();
    const startOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay() + 1); // Понедельник
    startOfWeek.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Получаем все доставленные заказы курьера
    const deliveredOrders = await this.prisma.order.findMany({
      where: {
        courierId,
        status: 'DELIVERED',
      },
      select: {
        id: true,
        orderNumber: true,
        customerName: true,
        addressLine: true,
        totalAmount: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: 'desc' },
    });

    // Считаем статистику
    const totalDeliveries = deliveredOrders.length;

    // Доставки за день
    const deliveriesToday = deliveredOrders.filter(
      (o) => new Date(o.updatedAt) >= startOfDay,
    ).length;

    // Доставки за неделю
    const deliveriesThisWeek = deliveredOrders.filter(
      (o) => new Date(o.updatedAt) >= startOfWeek,
    ).length;

    // Доставки за месяц
    const deliveriesThisMonth = deliveredOrders.filter(
      (o) => new Date(o.updatedAt) >= startOfMonth,
    ).length;

    // Заработок
    const deliveryRate = Number(courier.deliveryRate) || 0;
    const earningsToday = deliveriesToday * deliveryRate;
    const earningsThisWeek = deliveriesThisWeek * deliveryRate;
    const earningsThisMonth = deliveriesThisMonth * deliveryRate;
    const totalEarnings = totalDeliveries * deliveryRate;

    // Последние 20 доставок для истории
    const recentDeliveries = deliveredOrders.slice(0, 20).map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      customerName: o.customerName,
      addressLine: o.addressLine,
      totalAmount: o.totalAmount,
      deliveredAt: o.updatedAt,
      earnings: deliveryRate,
    }));

    return {
      stats: {
        deliveryRate,
        totalDeliveries,
        deliveriesToday,
        deliveriesThisWeek,
        deliveriesThisMonth,
        earningsToday,
        earningsThisWeek,
        earningsThisMonth,
        totalEarnings,
      },
      recentDeliveries,
    };
  }
}
