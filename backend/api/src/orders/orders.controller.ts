/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { JwtGuard } from '../auth/jwt.guard';
import { CreateOrderDto } from './dto';
import { EventsService } from '../events/events.service';

@Controller('v1/orders')
export class OrdersController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsService: EventsService,
  ) {}

  @UseGuards(JwtGuard)
  @Post()
  async create(@Req() req: any, @Body() dto: CreateOrderDto) {
    const userId = req.user?.sub as string | undefined;
    if (!userId) {
      throw new UnauthorizedException('User not found in token');
    }

    // 1. Ищем корзину со всеми товарами
    const cart = await this.prisma.cart.findUnique({
      where: { token: dto.cartToken },
      include: { items: { include: { product: true } } },
    });

    // 2. Валидация: корзина должна существовать и быть не пустой
    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    // 3. Считаем сумму товаров (используем цены из DarkstoreProduct если есть даркстор)
    let subtotal = 0;
    let purchaseCost = 0;
    let darkstoreId: string | null = null;
    let deliveryFee = 0;
    let courierCost = 0;
    const settlementCode = dto.settlement || null;

    if (settlementCode) {
      const deliveryZone = await this.prisma.deliveryZone.findFirst({
        where: { settlement: settlementCode as any, isActive: true },
      });

      if (deliveryZone) {
        courierCost = deliveryZone.deliveryFee;
        darkstoreId = deliveryZone.darkstoreId;
      }
    }

    // Подтягиваем цены из DarkstoreProduct для этого даркстора
    const itemPrices: Map<string, { price: number; purchasePrice: number }> = new Map();
    if (darkstoreId) {
      const dpList = await this.prisma.darkstoreProduct.findMany({
        where: {
          darkstoreId,
          productId: { in: cart.items.map((it) => it.productId) },
        },
      });
      for (const dp of dpList) {
        itemPrices.set(dp.productId, {
          price: dp.price,
          purchasePrice: dp.purchasePrice ?? 0,
        });
      }
    }

    for (const item of cart.items) {
      const dp = itemPrices.get(item.productId);
      const price = dp?.price ?? 0;
      subtotal += price * item.qty;
      purchaseCost += (dp?.purchasePrice ?? 0) * item.qty;
    }

    // 4. Рассчитываем стоимость доставки
    if (darkstoreId && settlementCode) {
      const deliveryZone = await this.prisma.deliveryZone.findFirst({
        where: { settlement: settlementCode as any, isActive: true },
      });
      if (deliveryZone && subtotal < deliveryZone.freeDeliveryFrom) {
        deliveryFee = deliveryZone.deliveryFee;
      }
    }

    const total = subtotal + deliveryFee;

    // 6. Прибыль = 0 при создании заказа. Реальная прибыль рассчитывается только после доставки (DELIVERED)
    const profit = 0;

    // Resolve darkstoreId - required field
    let resolvedDarkstoreId = darkstoreId;
    if (!resolvedDarkstoreId) {
      const defaultDs = await this.prisma.darkstore.findFirst({ where: { isActive: true } });
      resolvedDarkstoreId = defaultDs?.id || 'default-darkstore';
    }

    // 7. Выполняем транзакцию: проверяем остатки, резервируем товар, создаем заказ
    const createdOrder = await this.prisma.$transaction(async (tx) => {
      // Атомарная проверка остатков и резервирование (decrement stock)
      if (darkstoreId) {
        const stockIssues: Array<{ productId: string; title: string; requested: number; available: number }> = [];

        for (const item of cart.items) {
          const dp = await tx.darkstoreProduct.findUnique({
            where: { productId_darkstoreId: { darkstoreId, productId: item.productId } },
          });
          const available = dp?.stock ?? 0;
          if (item.qty > available) {
            stockIssues.push({
              productId: item.productId,
              title: item.product.title,
              requested: item.qty,
              available,
            });
          }
        }

        if (stockIssues.length > 0) {
          throw new BadRequestException({
            message: 'Некоторых товаров нет в достаточном количестве',
            stockIssues,
          });
        }

        // Резервируем товар: уменьшаем остатки на складе
        for (const item of cart.items) {
          await tx.darkstoreProduct.update({
            where: { productId_darkstoreId: { darkstoreId, productId: item.productId } },
            data: { stock: { decrement: item.qty } },
          });
        }
      }

      const order = await tx.order.create({
        data: {
          cartId: cart.id,
          cartToken: cart.token,
          user: { connect: { id: userId } },
          customerName: dto.customerName,
          phone: dto.phone,
          addressLine: dto.addressLine,
          comment: dto.comment,
          totalAmount: total,
          deliveryFee,
          purchaseCost,
          courierCost,
          profit,
          settlement: settlementCode,
          darkstore: { connect: { id: resolvedDarkstoreId } },
          items: {
            create: cart.items.map((it) => {
              const dp = itemPrices.get(it.productId);
              const price = dp?.price ?? 0;
              return {
                productId: it.productId,
                title: it.product.title,
                price,
                qty: it.qty,
                amount: price * it.qty,
              };
            }),
          },
        },
        include: { items: true },
      });

      // Помечаем корзину как "оформленную"
      await tx.cart.update({
        where: { id: cart.id },
        data: { status: 'CHECKED_OUT' },
      });

      return order;
    });

    // 5. Отправляем событие о новом заказе через SSE
    this.eventsService.emitOrderEvent({
      type: 'NEW_ORDER',
      order: {
        id: createdOrder.id,
        orderNumber: createdOrder.orderNumber,
        customerName: createdOrder.customerName,
        phone: createdOrder.phone,
        totalAmount: createdOrder.totalAmount,
        status: createdOrder.status,
        createdAt: createdOrder.createdAt,
      },
    });

    return createdOrder;
  }

  @Get(':orderNumber')
  get(@Param('orderNumber') orderNumber: string) {
    return this.prisma.order.findUnique({
      where: { orderNumber: Number(orderNumber) },
      include: { items: true },
    });
  }

  @UseGuards(JwtGuard)
  @Patch(':orderNumber/cancel')
  async cancel(@Req() req: any, @Param('orderNumber') orderNumber: string) {
    const userId = req.user?.sub as string | undefined;
    if (!userId) {
      throw new UnauthorizedException('User not found in token');
    }

    const order = await this.prisma.order.findUnique({
      where: { orderNumber: Number(orderNumber) },
      include: { items: true },
    });

    if (!order) {
      throw new BadRequestException('Заказ не найден');
    }

    // Только владелец заказа может отменить
    if (order.userId !== userId) {
      throw new BadRequestException('Нет доступа к этому заказу');
    }

    // Клиент может отменить только заказ в статусе NEW
    if (order.status !== 'NEW') {
      throw new BadRequestException(
        'Отменить можно только заказ в статусе «Новый». Свяжитесь с менеджером.',
      );
    }

    const updatedOrder = await this.prisma.$transaction(async (tx) => {
      // Возвращаем товар на склад
      if (order.darkstoreId) {
        for (const item of order.items) {
          await tx.darkstoreProduct.updateMany({
            where: { productId: item.productId, darkstoreId: order.darkstoreId },
            data: { stock: { increment: item.qty } },
          });
        }
      }

      // Обновляем статус
      const updated = await tx.order.update({
        where: { id: order.id },
        data: { status: 'CANCELED', profit: 0 },
        include: { items: true },
      });

      // Создаём запись в истории
      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          status: 'CANCELED',
          comment: 'Отменён клиентом',
          changedBy: 'client',
        },
      });

      return updated;
    });

    // SSE-уведомление
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

    return { success: true };
  }
}
