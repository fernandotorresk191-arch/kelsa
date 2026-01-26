import { Controller, Get, Param, Query } from '@nestjs/common';
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

  @Get('categories/:slug/subcategories')
  async subcategories(@Param('slug') slug: string) {
    const category = await this.prisma.category.findUnique({
      where: { slug },
      select: { id: true },
    });
    
    if (!category) {
      return [];
    }
    
    return this.prisma.category.findMany({
      where: { isActive: true, parentId: category.id },
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
    @Query('subcategorySlug') subcategorySlug?: string,
    @Query('q') q?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
  ) {
    const take = Math.min(Number(limit ?? 50), 100);
    const skip = Math.max(Number(offset ?? 0), 0);

    // Определяем порядок сортировки
    let orderBy: any[] = [{ createdAt: 'desc' }];
    if (sortBy === 'price') {
      orderBy = [{ price: sortOrder === 'desc' ? 'desc' : 'asc' }];
    }

    return this.prisma.product.findMany({
      where: {
        isActive: true,
        stock: { gt: 0 }, // Показываем только товары в наличии
        ...(subcategorySlug 
          ? { subcategory: { is: { slug: subcategorySlug } } }
          : categorySlug 
            ? { category: { is: { slug: categorySlug } } } 
            : {}),
        ...(q
          ? {
              OR: [
                { title: { contains: q, mode: 'insensitive' } },
                { description: { contains: q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
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
