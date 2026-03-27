/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { AddItemDto, UpdateQtyDto } from './dto';

@Controller('v1/cart')
export class CartController {
  constructor(private readonly prisma: PrismaService) {}

  // Резолвим darkstoreId по settlement для обогащения продуктов ценами
  private async resolveDarkstoreId(settlement?: string): Promise<string | null> {
    if (!settlement) return null;
    const zone = await this.prisma.deliveryZone.findFirst({
      where: { settlement, isActive: true },
      select: { darkstoreId: true },
    });
    return zone?.darkstoreId || null;
  }

  // Обогащаем продукты ценами из DarkstoreProduct
  private async enrichCartWithPrices(cart: any, darkstoreId: string | null) {
    if (!darkstoreId || !cart.items || cart.items.length === 0) return cart;

    const productIds = cart.items.map((it: any) => it.productId);
    const dpList = await this.prisma.darkstoreProduct.findMany({
      where: { darkstoreId, productId: { in: productIds } },
    });
    const dpMap = new Map(dpList.map((dp) => [dp.productId, dp]));

    return {
      ...cart,
      items: cart.items.map((item: any) => {
        const dp = dpMap.get(item.productId);
        if (dp && item.product) {
          return {
            ...item,
            product: {
              ...item.product,
              price: dp.price,
              oldPrice: dp.oldPrice,
            },
          };
        }
        return item;
      }),
    };
  }

  @Get(':token')
  async get(@Param('token') token: string, @Query('settlement') settlement?: string) {
    const darkstoreId = await this.resolveDarkstoreId(settlement);

    const cart = await this.prisma.cart.findUnique({
      where: { token },
      include: {
        items: {
          include: { product: { include: { category: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!cart) {
      const created = await this.prisma.cart.create({ data: { token } });
      return { ...created, items: [] };
    }

    return this.enrichCartWithPrices(cart, darkstoreId);
  }

  @Post('items')
  async add(@Body() dto: AddItemDto, @Query('settlement') settlement?: string) {
    const { cartToken: token, productId, qty } = dto;

    // 1. Убедимся, что товар существует
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product || !product.isActive) {
      throw new NotFoundException('Product not found');
    }

    // 2. Получаем или создаем корзину (аналог getOrCreateCart)
    let cart = await this.prisma.cart.findUnique({ where: { token } });
    if (!cart) {
      cart = await this.prisma.cart.create({ data: { token } });
    }

    // 3. Upsert элемента корзины
    await this.prisma.cartItem.upsert({
      where: { cartId_productId: { cartId: cart.id, productId } },
      update: { qty: { increment: qty } },
      create: { cartId: cart.id, productId, qty },
    });

    // 4. Возвращаем обновленную корзину (рекурсивный вызов метода get этого же контроллера)
    return this.get(token, settlement);
  }

  @Patch('items/:itemId')
  async updateQty(@Param('itemId') itemId: string, @Body() dto: UpdateQtyDto, @Query('settlement') settlement?: string) {
    const cart = await this.prisma.cart.findUnique({
      where: { token: dto.cartToken },
    });

    if (!cart) throw new NotFoundException('Cart not found');

    await this.prisma.cartItem.update({
      where: { id: itemId },
      data: { qty: dto.qty },
    });

    return this.get(dto.cartToken, settlement);
  }

  @Delete('items/:itemId/:token')
  async remove(@Param('itemId') itemId: string, @Param('token') token: string, @Query('settlement') settlement?: string) {
    const cart = await this.prisma.cart.findUnique({ where: { token } });
    if (!cart) throw new NotFoundException('Cart not found');

    await this.prisma.cartItem.delete({ where: { id: itemId } });

    return this.get(token, settlement);
  }

  @Get(':token/totals')
  async totals(@Param('token') token: string, @Query('settlement') settlement?: string) {
    const cart = await this.get(token, settlement);

    const total = cart.items.reduce(
      (sum, it) => sum + (it.product.price ?? 0) * it.qty,
      0,
    );

    return { totalAmount: total };
  }
}
