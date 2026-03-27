import { Controller, Get, Param, Query } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';

@Controller('v1')
export class CatalogController {
  constructor(private readonly prisma: PrismaService) {}

  private async resolveDarkstoreId(settlement?: string): Promise<string | null> {
    if (!settlement) return null;
    const zone = await this.prisma.deliveryZone.findFirst({
      where: { settlement, isActive: true },
      select: { darkstoreId: true },
    });
    return zone?.darkstoreId || null;
  }

  @Get('categories')
  async categories(@Query('settlement') settlement?: string) {
    const darkstoreId = await this.resolveDarkstoreId(settlement);
    const where: any = { isActive: true, parentId: null };
    if (darkstoreId) where.darkstoreId = darkstoreId;

    return this.prisma.category.findMany({
      where,
      orderBy: [{ sort: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true, slug: true, description: true, sort: true, imageUrl: true },
    });
  }

  @Get('categories/:slug/subcategories')
  async subcategories(
    @Param('slug') slug: string,
    @Query('settlement') settlement?: string,
  ) {
    const darkstoreId = await this.resolveDarkstoreId(settlement);
    const catWhere: any = { slug };
    if (darkstoreId) catWhere.darkstoreId = darkstoreId;

    const category = await this.prisma.category.findFirst({
      where: catWhere,
      select: { id: true },
    });
    
    if (!category) {
      return [];
    }
    
    return this.prisma.category.findMany({
      where: { isActive: true, parentId: category.id },
      orderBy: [{ sort: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true, slug: true, description: true, sort: true, imageUrl: true },
    });
  }

  @Get('promotions')
  async promotions(@Query('settlement') settlement?: string) {
    const darkstoreId = await this.resolveDarkstoreId(settlement);
    const where: any = { isActive: true };
    if (darkstoreId) where.darkstoreId = darkstoreId;

    return this.prisma.promotion.findMany({
      where,
      orderBy: [{ sort: 'asc' }, { createdAt: 'desc' }],
      select: { id: true, title: true, imageUrl: true, url: true, sort: true },
    });
  }

  @Get('delivery-settings')
  async deliverySettings(@Query('settlement') settlement?: string) {
    const where: any = { isActive: true };
    if (settlement) {
      // Return zone for specific settlement
      const zone = await this.prisma.deliveryZone.findFirst({
        where: { settlement, isActive: true },
      });

      if (!zone) {
        return { deliveryFee: 0, freeDeliveryFrom: 0, isActive: false, zones: [] };
      }

      return {
        deliveryFee: zone.deliveryFee,
        freeDeliveryFrom: zone.freeDeliveryFrom,
        isActive: true,
        zones: [{
          settlement: zone.settlement,
          settlementTitle: zone.settlementTitle || zone.settlement,
          deliveryFee: zone.deliveryFee,
          freeDeliveryFrom: zone.freeDeliveryFrom,
        }],
      };
    }

    // Return all active zones
    const zones = await this.prisma.deliveryZone.findMany({ where });

    if (zones.length === 0) {
      return { deliveryFee: 0, freeDeliveryFrom: 0, isActive: false, zones: [] };
    }

    return {
      deliveryFee: zones[0].deliveryFee,
      freeDeliveryFrom: zones[0].freeDeliveryFrom,
      isActive: true,
      zones: zones.map((z) => ({
        settlement: z.settlement,
        settlementTitle: z.settlementTitle || z.settlement,
        deliveryFee: z.deliveryFee,
        freeDeliveryFrom: z.freeDeliveryFrom,
      })),
    };
  }

  @Get('products')
  async products(
    @Query('categorySlug') categorySlug?: string,
    @Query('subcategorySlug') subcategorySlug?: string,
    @Query('q') q?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
    @Query('settlement') settlement?: string,
  ) {
    const take = Math.min(Number(limit ?? 50), 100);
    const skip = Math.max(Number(offset ?? 0), 0);
    const darkstoreId = await this.resolveDarkstoreId(settlement);

    // Определяем порядок сортировки
    let orderBy: any[] = [{ createdAt: 'desc' }];
    if (sortBy === 'price') {
      orderBy = [{ price: sortOrder === 'desc' ? 'desc' : 'asc' }];
    }

    if (darkstoreId) {
      // Запрос через DarkstoreProduct для конкретного даркстора
      const dpWhere: any = {
        darkstoreId,
        isActive: true,
        stock: { gt: 0 },
        product: { isActive: true },
      };

      if (subcategorySlug) {
        dpWhere.subcategory = { is: { slug: subcategorySlug } };
      } else if (categorySlug) {
        dpWhere.category = { is: { slug: categorySlug } };
      }

      if (q) {
        dpWhere.product = {
          ...dpWhere.product,
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
          ],
        };
      }

      let dpOrderBy: any[] = [{ product: { createdAt: 'desc' } }];
      if (sortBy === 'price') {
        dpOrderBy = [{ price: sortOrder === 'desc' ? 'desc' : 'asc' }];
      }

      const darkstoreProducts = await this.prisma.darkstoreProduct.findMany({
        where: dpWhere,
        orderBy: dpOrderBy,
        take,
        skip,
        include: {
          product: true,
          category: { select: { id: true, name: true, slug: true } },
          subcategory: { select: { id: true, name: true, slug: true } },
        },
      });

      // Возвращаем в формате, совместимом с текущим фронтом
      return darkstoreProducts.map((dp) => ({
        id: dp.product.id,
        title: dp.product.title,
        slug: dp.product.slug,
        description: dp.product.description,
        imageUrl: dp.product.imageUrl,
        weightGr: dp.product.weightGr,
        isActive: dp.product.isActive && dp.isActive,
        price: dp.price,
        oldPrice: dp.oldPrice,
        categoryId: dp.categoryId,
        category: dp.category,
        subcategoryId: dp.subcategoryId,
        subcategory: dp.subcategory,
        createdAt: dp.product.createdAt,
        updatedAt: dp.product.updatedAt,
      }));
    }

    // Без settlement — возвращаем глобальные товары (без цен/остатков)
    const where: any = {
      isActive: true,
    };

    if (subcategorySlug) {
      where.subcategory = { is: { slug: subcategorySlug } };
    } else if (categorySlug) {
      where.category = { is: { slug: categorySlug } };
    }

    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ];
    }

    return this.prisma.product.findMany({
      where,
      orderBy,
      take,
      skip,
      include: {
        category: { select: { id: true, name: true, slug: true } },
        subcategory: { select: { id: true, name: true, slug: true } },
      },
    });
  }
}
