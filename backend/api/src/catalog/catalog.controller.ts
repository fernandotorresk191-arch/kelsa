import { Controller, Get, Query } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';

@Controller('v1')
export class CatalogController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('categories')
  categories() {
    return this.prisma.category.findMany({
      where: { isActive: true, parentId: null },
      orderBy: [{ sort: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true, slug: true, sort: true, imageUrl: true },
    });
  }

  @Get('promotions')
  promotions() {
    return this.prisma.promotion.findMany({
      where: { isActive: true },
      orderBy: [{ sort: 'asc' }, { createdAt: 'desc' }],
      select: { id: true, title: true, imageUrl: true, url: true, sort: true },
    });
  }

  @Get('products')
  products(
    @Query('categorySlug') categorySlug?: string,
    @Query('q') q?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const take = Math.min(Number(limit ?? 50), 100);
    const skip = Math.max(Number(offset ?? 0), 0);

    return this.prisma.product.findMany({
      where: {
        isActive: true,
        ...(categorySlug ? { category: { is: { slug: categorySlug } } } : {}),
        ...(q
          ? {
              OR: [
                { title: { contains: q, mode: 'insensitive' } },
                { description: { contains: q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: [{ createdAt: 'desc' }],
      take,
      skip,
      include: {
        category: { select: { id: true, name: true, slug: true } },
      },
    });
  }
}
