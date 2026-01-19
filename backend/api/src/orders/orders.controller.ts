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
} from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { CreateOrderDto } from './dto';

@Controller('v1/orders')
export class OrdersController {
  constructor(private readonly prisma: PrismaService) {}

  @Post()
  async create(@Body() dto: CreateOrderDto) {
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
    return this.prisma.$transaction(async (tx) => {
      const createdOrder = await tx.order.create({
        data: {
          cartId: cart.id,
          cartToken: cart.token,
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

      return createdOrder;
    });
  }

  @Get(':orderNumber')
  get(@Param('orderNumber') orderNumber: string) {
    return this.prisma.order.findUnique({
      where: { orderNumber: Number(orderNumber) },
      include: { items: true },
    });
  }
}
