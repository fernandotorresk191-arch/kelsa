import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
  Req,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { JwtGuard } from '../auth/jwt.guard';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { EventsService } from '../events/events.service';

enum OrderStatus {
  NEW = 'NEW',
  CONFIRMED = 'CONFIRMED',
  ASSEMBLING = 'ASSEMBLING',
  ASSIGNED_TO_COURIER = 'ASSIGNED_TO_COURIER',
  ACCEPTED_BY_COURIER = 'ACCEPTED_BY_COURIER',
  ON_THE_WAY = 'ON_THE_WAY',
  DELIVERED = 'DELIVERED',
  CANCELED = 'CANCELED',
}

class UpdateOrderStatusDto {
  @IsEnum(OrderStatus)
  status: OrderStatus;

  @IsOptional()
  @IsString()
  comment?: string;
}

class AssignCourierDto {
  @IsString()
  courierId: string;
}

interface AuthRequest {
  user: { role: string; login?: string };
}

interface OrderItem {
  product: {
    id: string;
    title: string;
    cellNumber?: string | null;
  };
  qty: number;
  price: number;
  amount: number;
  batchCode?: string | null;
}

interface OrderItemWithBatch extends OrderItem {
  batchInfo?: {
    batchCode: string;
    cellNumber: string;
    qtyFromBatch: number;
    expiryDate: Date | null;
  }[];
}

interface OrderData {
  orderNumber: number;
  status: string;
  createdAt: Date;
  customerName: string;
  phone: string;
  addressLine: string;
  totalAmount: number;
  comment?: string | null;
  items: OrderItemWithBatch[];
}

@Controller('v1/admin/orders')
@UseGuards(JwtGuard)
export class AdminOrdersController {
  constructor(
    private prisma: PrismaService,
    private eventsService: EventsService,
  ) {}

  private checkAdminRole(req: AuthRequest) {
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      throw new UnauthorizedException('Admin access required');
    }
  }

  @Get()
  async getOrders(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Query('status') status?: string,
    @Req() req?: AuthRequest,
  ) {
    this.checkAdminRole(req as AuthRequest);

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = status ? { status: status as OrderStatus } : {};

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: parseInt(limit),
        include: {
          items: {
            include: { product: { select: { id: true, title: true } } },
          },
          user: {
            select: { id: true, login: true, name: true, phone: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      data: orders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    };
  }

  // Получить список доступных курьеров для назначения
  // ВАЖНО: Этот маршрут должен быть ПЕРЕД @Get(':id'), иначе 'available-couriers' будет интерпретирован как :id
  @Get('available-couriers')
  async getAvailableCouriers(@Req() req: AuthRequest) {
    this.checkAdminRole(req);

    const couriers = await this.prisma.courier.findMany({
      where: {
        isActive: true,
        status: { in: ['AVAILABLE', 'ACCEPTED'] },
      },
      select: {
        id: true,
        fullName: true,
        phone: true,
        carBrand: true,
        carNumber: true,
        status: true,
        _count: {
          select: {
            orders: {
              where: {
                status: {
                  in: ['ASSIGNED_TO_COURIER', 'ACCEPTED_BY_COURIER'],
                },
              },
            },
          },
        },
      },
      orderBy: { fullName: 'asc' },
    });

    return {
      data: couriers.map((c) => ({
        ...c,
        activeOrdersCount: c._count.orders,
      })),
    };
  }

  @Get(':id')
  async getOrderById(@Param('id') id: string, @Req() req: AuthRequest) {
    this.checkAdminRole(req);

    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: { product: true },
        },
        user: true,
        statusHistory: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!order) {
      throw new Error('Order not found');
    }

    return order;
  }

  @Patch(':id/status')
  async updateOrderStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
    @Req() req: AuthRequest,
  ) {
    this.checkAdminRole(req);

    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) {
      throw new Error('Order not found');
    }

    // Получаем логин админа из токена
    const adminLogin = req.user?.login || 'admin';

    // Обновляем статус заказа и создаём запись в истории
    const updatedOrder = await this.prisma.$transaction(async (tx) => {
      // Создаём запись в истории статусов
      await tx.orderStatusHistory.create({
        data: {
          orderId: id,
          status: dto.status,
          comment: dto.comment || null,
          changedBy: adminLogin,
        },
      });

      // Обновляем статус заказа
      return tx.order.update({
        where: { id },
        data: { status: dto.status },
      });
    });

    // Отправляем событие об обновлении заказа через SSE
    // userId нужен для фильтрации событий для конкретного клиента
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

  // Назначить курьера на заказ
  @Patch(':id/assign-courier')
  async assignCourier(
    @Param('id') id: string,
    @Body() dto: AssignCourierDto,
    @Req() req: AuthRequest,
  ) {
    this.checkAdminRole(req);

    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) {
      throw new BadRequestException('Заказ не найден');
    }

    // Проверяем, что заказ в статусе ASSEMBLING
    if (order.status !== 'ASSEMBLING') {
      throw new BadRequestException(
        'Заказ должен быть в статусе "Собирается" для назначения курьера',
      );
    }

    // Проверяем, что курьер существует и доступен
    const courier = await this.prisma.courier.findUnique({
      where: { id: dto.courierId },
    });

    if (!courier) {
      throw new BadRequestException('Курьер не найден');
    }

    if (!courier.isActive) {
      throw new BadRequestException('Курьер деактивирован');
    }

    if (courier.status === 'DELIVERING') {
      throw new BadRequestException('Курьер сейчас на доставке');
    }

    const adminLogin = req.user?.login || 'manager';

    // Назначаем курьера и меняем статус заказа
    const updatedOrder = await this.prisma.$transaction(async (tx) => {
      // Обновляем заказ
      const updated = await tx.order.update({
        where: { id },
        data: {
          courierId: dto.courierId,
          status: 'ASSIGNED_TO_COURIER',
        },
      });

      // Записываем в историю
      await tx.orderStatusHistory.create({
        data: {
          orderId: id,
          status: 'ASSIGNED_TO_COURIER',
          comment: `Назначен курьер: ${courier.fullName}`,
          changedBy: adminLogin,
        },
      });

      return updated;
    });

    // Отправляем SSE событие для админов
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
        addressLine: updatedOrder.addressLine,
      },
      userId: updatedOrder.userId,
    });

    // Отправляем SSE событие для курьера
    this.eventsService.emitOrderEvent({
      type: 'ORDER_ASSIGNED_TO_COURIER',
      order: {
        id: updatedOrder.id,
        orderNumber: updatedOrder.orderNumber,
        customerName: updatedOrder.customerName,
        phone: updatedOrder.phone,
        totalAmount: updatedOrder.totalAmount,
        status: updatedOrder.status,
        createdAt: updatedOrder.createdAt,
        addressLine: updatedOrder.addressLine,
      },
      courierId: dto.courierId,
    });

    return { success: true, order: updatedOrder };
  }

  @Get(':id/print/invoice')
  async printInvoice(@Param('id') id: string, @Req() req: AuthRequest) {
    this.checkAdminRole(req);

    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        items: { include: { product: true } },
        user: true,
      },
    });

    if (!order) {
      throw new Error('Order not found');
    }

    // Возвращаем HTML для печати накладной
    return {
      html: this.generateInvoiceHTML(order),
      fileName: `invoice-${order.orderNumber}.html`,
    };
  }

  @Get(':id/print/picking')
  async printPickingList(@Param('id') id: string, @Req() req: AuthRequest) {
    this.checkAdminRole(req);

    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        items: { include: { product: true } },
        user: true,
      },
    });

    if (!order) {
      throw new Error('Order not found');
    }

    // Получаем информацию о партиях для каждого товара (FIFO)
    const itemsWithBatches: OrderItemWithBatch[] = [];
    
    for (const item of order.items) {
      // Находим партии по FIFO (сначала с ближайшим сроком годности)
      const batches = await this.prisma.batch.findMany({
        where: {
          productId: item.productId,
          status: 'ACTIVE',
          remainingQty: { gt: 0 },
        },
        orderBy: [
          { expiryDate: 'asc' },
          { createdAt: 'asc' },
        ],
      });

      const batchInfo: OrderItemWithBatch['batchInfo'] = [];
      let remaining = item.qty;

      for (const batch of batches) {
        if (remaining <= 0) break;
        const qtyFromBatch = Math.min(batch.remainingQty, remaining);
        batchInfo.push({
          batchCode: batch.batchCode,
          cellNumber: batch.cellNumber,
          qtyFromBatch,
          expiryDate: batch.expiryDate,
        });
        remaining -= qtyFromBatch;
      }

      itemsWithBatches.push({
        ...item,
        batchInfo: batchInfo.length > 0 ? batchInfo : undefined,
      });
    }

    // Возвращаем HTML для печати накладной сбора
    return {
      html: this.generatePickingListHTML({ ...order, items: itemsWithBatches }),
      fileName: `picking-${order.orderNumber}.html`,
    };
  }

  private generateInvoiceHTML(order: OrderData): string {
    const itemsHTML = order.items
      .map(
        (item) => `
      <tr>
        <td>${item.product.title}</td>
        <td style="text-align: center">${item.qty}</td>
        <td style="text-align: right">${item.price} ₽</td>
        <td style="text-align: right">${item.amount} ₽</td>
      </tr>
    `,
      )
      .join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Накладная №${order.orderNumber}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .invoice-info { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
          th { background-color: #f0f0f0; font-weight: bold; }
          .total { font-size: 16px; font-weight: bold; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Накладная</h1>
          <p>Заказ №${order.orderNumber}</p>
        </div>

        <div class="invoice-info">
          <div>
            <h3>Информация о заказе</h3>
            <p><strong>Статус:</strong> ${order.status}</p>
            <p><strong>Дата:</strong> ${new Date(order.createdAt).toLocaleDateString('ru-RU')}</p>
          </div>
          <div>
            <h3>Получатель</h3>
            <p><strong>Имя:</strong> ${order.customerName}</p>
            <p><strong>Телефон:</strong> ${order.phone}</p>
            <p><strong>Адрес:</strong> ${order.addressLine}</p>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Товар</th>
              <th>Кол-во</th>
              <th>Цена</th>
              <th>Сумма</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHTML}
          </tbody>
          <tfoot>
            <tr class="total">
              <td colspan="3">Итого:</td>
              <td>${order.totalAmount} ₽</td>
            </tr>
          </tfoot>
        </table>

        ${order.comment ? `<p><strong>Комментарий:</strong> ${order.comment}</p>` : ''}
      </body>
      </html>
    `;
  }

  private generatePickingListHTML(order: OrderData): string {
    // Разворачиваем товары по партиям для удобства сборки
    const expandedItems: Array<{
      productTitle: string;
      cellNumber: string;
      batchCode: string;
      qty: number;
      expiryDate: Date | null;
    }> = [];

    for (const item of order.items) {
      if (item.batchInfo && item.batchInfo.length > 0) {
        // Есть информация о партиях
        for (const batch of item.batchInfo) {
          expandedItems.push({
            productTitle: item.product.title,
            cellNumber: batch.cellNumber,
            batchCode: batch.batchCode,
            qty: batch.qtyFromBatch,
            expiryDate: batch.expiryDate,
          });
        }
      } else {
        // Нет партий (старые товары без партионного учёта)
        expandedItems.push({
          productTitle: item.product.title,
          cellNumber: item.product.cellNumber || '—',
          batchCode: '—',
          qty: item.qty,
          expiryDate: null,
        });
      }
    }

    // Сортируем по номеру ячейки для удобства сборки
    const sortedItems = expandedItems.sort((a, b) => {
      const cellA: string = a.cellNumber || 'zzz';
      const cellB: string = b.cellNumber || 'zzz';
      return cellA.localeCompare(cellB);
    });

    const itemsHTML = sortedItems
      .map(
        (item, index) => `
      <tr>
        <td style="text-align: center">${index + 1}</td>
        <td style="font-size: 20px; font-weight: bold; text-align: center; background-color: #ffffcc;">${item.cellNumber}</td>
        <td style="font-size: 14px; font-weight: bold; text-align: center; background-color: #e6f3ff; font-family: monospace;">${item.batchCode}</td>
        <td>${item.productTitle}</td>
        <td style="text-align: center; font-size: 18px; font-weight: bold; background-color: #e6ffe6;">${item.qty}</td>
        <td style="text-align: center; font-size: 12px; color: ${item.expiryDate && new Date(item.expiryDate) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) ? 'red; font-weight: bold' : '#666'}">
          ${item.expiryDate ? new Date(item.expiryDate).toLocaleDateString('ru-RU') : '—'}
        </td>
        <td style="text-align: center; width: 40px;">☐</td>
      </tr>
    `,
      )
      .join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Накладная сбора №${order.orderNumber}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 15px; }
          .header h1 { margin: 0; font-size: 28px; }
          .header p { margin: 5px 0; font-size: 14px; color: #666; }
          .order-info { margin-bottom: 20px; padding: 10px; background: #f5f5f5; border-radius: 5px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th, td { border: 1px solid #333; padding: 10px 6px; text-align: left; }
          th { background-color: #333; color: white; font-weight: bold; font-size: 12px; }
          .legend { margin-bottom: 15px; padding: 10px; background: #f9f9f9; border-radius: 5px; font-size: 12px; }
          .legend span { margin-right: 20px; }
          .footer { margin-top: 30px; display: flex; justify-content: space-between; }
          .signature { border-top: 1px solid #333; padding-top: 5px; width: 200px; text-align: center; }
          @media print { 
            body { padding: 10px; } 
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>📦 НАКЛАДНАЯ СБОРА</h1>
          <p>Заказ №${order.orderNumber} от ${new Date(order.createdAt).toLocaleDateString('ru-RU')}</p>
        </div>

        <div class="order-info">
          <strong>Клиент:</strong> ${order.customerName} | 
          <strong>Телефон:</strong> ${order.phone} | 
          <strong>Адрес:</strong> ${order.addressLine}
        </div>

        <div class="legend">
          <span>📍 <strong>Ячейка</strong> - место хранения</span>
          <span>🏷️ <strong>Код партии</strong> - формат: Ячейка Закупка Товар</span>
          <span>⏰ <strong>Срок</strong> - срок годности</span>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 30px">№</th>
              <th style="width: 70px">📍 Ячейка</th>
              <th style="width: 120px">🏷️ Код партии</th>
              <th>Товар</th>
              <th style="width: 60px">Кол-во</th>
              <th style="width: 80px">⏰ Срок</th>
              <th style="width: 40px">✓</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHTML}
          </tbody>
        </table>

        <p><strong>Всего позиций:</strong> ${sortedItems.length} | <strong>Всего единиц:</strong> ${sortedItems.reduce((sum, item) => sum + item.qty, 0)}</p>

        ${order.comment ? `<p style="background: #fff3cd; padding: 10px; border-radius: 5px;"><strong>⚠️ Комментарий:</strong> ${order.comment}</p>` : ''}

        <div class="footer">
          <div class="signature">Собрал: _______________</div>
          <div class="signature">Дата/Время: ___________</div>
        </div>
      </body>
      </html>
    `;
  }
}
