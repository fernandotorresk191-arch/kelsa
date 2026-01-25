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

    // 3. Считаем общую сумму
    const total = cart.items.reduce(
      (sum, it) => sum + (it.product.price ?? 0) * it.qty,
      0,
    );

    // 4. Выполняем транзакцию: создаем заказ и обновляем статус корзины
    const createdOrder = await this.prisma.$transaction(async (tx) => {
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
          items: {
            create: cart.items.map((it) => ({
              productId: it.productId,
              title: it.product.title,
              price: it.product.price ?? 0,
              qty: it.qty,
              amount: (it.product.price ?? 0) * it.qty,
            })),
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
}
