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
} from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { JwtGuard } from '../auth/jwt.guard';
import { IsEnum, IsOptional, IsString } from 'class-validator';

enum OrderStatus {
  NEW = 'NEW',
  CONFIRMED = 'CONFIRMED',
  ASSEMBLING = 'ASSEMBLING',
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

interface AuthRequest {
  user: { role: string };
}

interface OrderItem {
  product: {
    title: string;
    cellNumber?: string | null;
  };
  qty: number;
  price: number;
  amount: number;
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
  items: OrderItem[];
}

@Controller('v1/admin/orders')
@UseGuards(JwtGuard)
export class AdminOrdersController {
  constructor(private prisma: PrismaService) {}

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

    // Обновляем статус заказа
    await this.prisma.order.update({
      where: { id },
      data: { status: dto.status },
    });

    return { success: true };
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

    // Возвращаем HTML для печати накладной сбора
    return {
      html: this.generatePickingListHTML(order),
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
    // Сортируем товары по номеру ячейки для удобства сборки
    const sortedItems = [...order.items].sort((a, b) => {
      const cellA: string = a.product.cellNumber || 'zzz';
      const cellB: string = b.product.cellNumber || 'zzz';
      return cellA.localeCompare(cellB);
    });

    const itemsHTML = sortedItems
      .map(
        (item, index) => `
      <tr>
        <td style="text-align: center">${index + 1}</td>
        <td style="font-size: 24px; font-weight: bold; text-align: center">${item.product.cellNumber || '—'}</td>
        <td>${item.product.title}</td>
        <td style="text-align: center; font-size: 20px; font-weight: bold">${item.qty}</td>
        <td style="text-align: center; width: 50px;">☐</td>
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
          th, td { border: 1px solid #333; padding: 12px 8px; text-align: left; }
          th { background-color: #333; color: white; font-weight: bold; }
          .cell-col { background-color: #ffffcc; }
          .qty-col { background-color: #e6ffe6; }
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

        <table>
          <thead>
            <tr>
              <th style="width: 40px">№</th>
              <th style="width: 100px" class="cell-col">Ячейка</th>
              <th>Товар</th>
              <th style="width: 80px" class="qty-col">Кол-во</th>
              <th style="width: 50px">✓</th>
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
