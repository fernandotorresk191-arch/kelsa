/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import {
  BadRequestException,
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

  // Обогащаем продукты ценами, остатками и лимитами из DarkstoreProduct
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
            stock: dp.stock,
            maxPerOrder: dp.maxPerOrder,
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

    // 3. Проверяем остатки и лимит на дарксторе
    const darkstoreId = await this.resolveDarkstoreId(settlement);
    if (darkstoreId) {
      const dp = await this.prisma.darkstoreProduct.findUnique({
        where: { productId_darkstoreId: { darkstoreId, productId } },
      });

      if (dp) {
        const existingItem = await this.prisma.cartItem.findUnique({
          where: { cartId_productId: { cartId: cart.id, productId } },
        });
        const currentQty = existingItem?.qty ?? 0;
        const newTotal = currentQty + qty;

        if (dp.maxPerOrder > 0 && newTotal > dp.maxPerOrder) {
          throw new BadRequestException(
            `Максимум ${dp.maxPerOrder} шт. на заказ для этого товара`,
          );
        }
        if (newTotal > dp.stock) {
          throw new BadRequestException(
            `Недостаточно товара на складе. Доступно: ${dp.stock} шт.`,
          );
        }
      }
    }

    // 4. Upsert элемента корзины
    await this.prisma.cartItem.upsert({
      where: { cartId_productId: { cartId: cart.id, productId } },
      update: { qty: { increment: qty } },
      create: { cartId: cart.id, productId, qty },
    });

    // 5. Возвращаем обновленную корзину
    return this.get(token, settlement);
  }

  @Patch('items/:itemId')
  async updateQty(@Param('itemId') itemId: string, @Body() dto: UpdateQtyDto, @Query('settlement') settlement?: string) {
    const cart = await this.prisma.cart.findUnique({
      where: { token: dto.cartToken },
    });

    if (!cart) throw new NotFoundException('Cart not found');

    // Проверяем остатки и лимит
    const cartItem = await this.prisma.cartItem.findUnique({ where: { id: itemId } });
    if (!cartItem) throw new NotFoundException('Cart item not found');

    const darkstoreId = await this.resolveDarkstoreId(settlement);
    if (darkstoreId) {
      const dp = await this.prisma.darkstoreProduct.findUnique({
        where: { productId_darkstoreId: { darkstoreId, productId: cartItem.productId } },
      });
      if (dp) {
        if (dp.maxPerOrder > 0 && dto.qty > dp.maxPerOrder) {
          throw new BadRequestException(
            `Максимум ${dp.maxPerOrder} шт. на заказ для этого товара`,
          );
        }
        if (dto.qty > dp.stock) {
          throw new BadRequestException(
            `Недостаточно товара на складе. Доступно: ${dp.stock} шт.`,
          );
        }
      }
    }

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

  // Валидация корзины перед оформлением заказа
  @Post(':token/validate')
  async validate(@Param('token') token: string, @Query('settlement') settlement?: string) {
    const cart = await this.get(token, settlement);
    const darkstoreId = await this.resolveDarkstoreId(settlement);

    const issues: Array<{
      productId: string;
      title: string;
      requested: number;
      available: number;
      maxPerOrder: number;
      reason: 'OUT_OF_STOCK' | 'INSUFFICIENT_STOCK' | 'OVER_LIMIT';
    }> = [];

    if (darkstoreId && cart.items.length > 0) {
      const productIds = cart.items.map((it: any) => it.productId);
      const dpList = await this.prisma.darkstoreProduct.findMany({
        where: { darkstoreId, productId: { in: productIds } },
      });
      const dpMap = new Map(dpList.map((dp) => [dp.productId, dp]));

      for (const item of cart.items as any[]) {
        const dp = dpMap.get(item.productId);
        if (!dp || dp.stock <= 0) {
          issues.push({
            productId: item.productId,
            title: item.product?.title || '',
            requested: item.qty,
            available: dp?.stock ?? 0,
            maxPerOrder: dp?.maxPerOrder ?? 0,
            reason: 'OUT_OF_STOCK',
          });
        } else if (item.qty > dp.stock) {
          issues.push({
            productId: item.productId,
            title: item.product?.title || '',
            requested: item.qty,
            available: dp.stock,
            maxPerOrder: dp.maxPerOrder,
            reason: 'INSUFFICIENT_STOCK',
          });
        } else if (dp.maxPerOrder > 0 && item.qty > dp.maxPerOrder) {
          issues.push({
            productId: item.productId,
            title: item.product?.title || '',
            requested: item.qty,
            available: dp.stock,
            maxPerOrder: dp.maxPerOrder,
            reason: 'OVER_LIMIT',
          });
        }
      }
    }

    return { ok: issues.length === 0, issues };
  }
}
