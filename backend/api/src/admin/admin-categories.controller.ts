import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
  Req,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { JwtGuard } from '../auth/jwt.guard';
import { IsBoolean, IsOptional, IsString, IsNumber } from 'class-validator';

class CreateCategoryDto {
  @IsString()
  name: string;

  @IsString()
  slug: string;

  @IsOptional()
  @IsNumber()
  sort?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsString()
  parentId?: string;
}

class UpdateCategoryDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsNumber()
  sort?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsString()
  parentId?: string;
}

@Controller('v1/admin/categories')
@UseGuards(JwtGuard)
export class AdminCategoriesController {
  constructor(private prisma: PrismaService) {}

  private checkAdminRole(req: any) {
    const user = (req as { user?: { role: string } })?.user;
    if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
      throw new UnauthorizedException('Admin access required');
    }
  }

  @Get()
  async getCategories(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '50',
    @Query('parentId') parentId?: string,
    @Req() req?: any,
  ) {
    this.checkAdminRole(req);

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Если parentId явно указан (не undefined), фильтруем по нему
    // Если parentId не указан, возвращаем все категории для админки
    const where = parentId !== undefined 
      ? (parentId === 'null' ? { parentId: null } : { parentId })
      : {};

    const [categories, total] = await Promise.all([
      this.prisma.category.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { sort: 'asc' },
        include: {
          parent: true,
          _count: {
            select: { 
              products: true,
              subcategories: true 
            },
          },
        },
      }),
      this.prisma.category.count({ where }),
    ]);

    // Подсчитываем товары с учетом subcategoryId для подкатегорий
    const categoriesWithProductCount = await Promise.all(
      categories.map(async (category) => {
        // Для подкатегорий считаем товары где subcategoryId = category.id
        // Для корневых категорий считаем товары где categoryId = category.id
        const productCount = await this.prisma.product.count({
          where: category.parentId
            ? { subcategoryId: category.id }
            : { categoryId: category.id },
        });

        return {
          ...category,
          _count: {
            products: productCount,
            subcategories: category._count.subcategories,
          },
        };
      }),
    );

    return {
      data: categoriesWithProductCount,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    };
  }

  @Get('check-slug/:slug')
  async checkSlug(
    @Param('slug') slug: string,
    @Query('excludeId') excludeId?: string,
    @Req() req?: { user?: { role: string } },
  ) {
    this.checkAdminRole(req as { user?: { role: string } });

    const existing = await this.prisma.category.findUnique({
      where: { slug },
    });

    const isAvailable = !existing || (excludeId && existing.id === excludeId);
    return { available: isAvailable, existingId: isAvailable ? null : existing?.id };
  }

  @Get(':id')
  async getCategoryById(@Param('id') id: string, @Req() req: { user?: { role: string } }) {
    this.checkAdminRole(req);

    return this.prisma.category.findUnique({
      where: { id },
      include: {
        parent: true,
        subcategories: true,
        _count: {
          select: { products: true, subcategories: true },
        },
      },
    });
  }

  @Post()
  async createCategory(@Body() dto: CreateCategoryDto, @Req() req: { user?: { role: string } }) {
    this.checkAdminRole(req);

    let finalSlug = dto.slug;

    // Если указан parentId, проверяем что родительская категория существует
    // и формируем slug с префиксом родителя
    if (dto.parentId) {
      const parent = await this.prisma.category.findUnique({
        where: { id: dto.parentId },
      });
      if (!parent) {
        throw new BadRequestException('Родительская категория не найдена');
      }
      // Формируем slug: parent-slug/subcategory-slug
      finalSlug = `${parent.slug}/${dto.slug}`;
    }

    // Проверяем уникальность итогового slug
    const existing = await this.prisma.category.findUnique({
      where: { slug: finalSlug },
    });

    if (existing) {
      throw new BadRequestException(`Категория с таким slug уже существует: "${finalSlug}". Измените slug.`);
    }

    return this.prisma.category.create({
      data: {
        name: dto.name,
        slug: finalSlug,
        sort: dto.sort ?? 0,
        isActive: dto.isActive ?? true,
        imageUrl: dto.imageUrl,
        parentId: dto.parentId || null,
      },
    });
  }

  @Put(':id')
  async updateCategory(
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
    @Req() req: { user?: { role: string } },
  ) {
    this.checkAdminRole(req);

    // Получаем текущую категорию
    const currentCategory = await this.prisma.category.findUnique({
      where: { id },
      include: { parent: true },
    });

    if (!currentCategory) {
      throw new BadRequestException('Категория не найдена');
    }

    let finalSlug = dto.slug || currentCategory.slug;
    let parentId = dto.parentId !== undefined ? dto.parentId : currentCategory.parentId;

    // Если указан parentId, проверяем что родительская категория существует
    if (parentId) {
      const parent = await this.prisma.category.findUnique({
        where: { id: parentId },
      });
      if (!parent) {
        throw new BadRequestException('Родительская категория не найдена');
      }
      // Проверяем, что категория не пытается стать потомком самой себя
      if (parentId === id) {
        throw new BadRequestException('Категория не может быть родителем самой себя');
      }

      // Если меняется slug или parentId, пересоздаем slug с префиксом
      if (dto.slug || dto.parentId !== undefined) {
        const baseSlug = dto.slug || currentCategory.slug.split('/').pop() || currentCategory.slug;
        finalSlug = `${parent.slug}/${baseSlug}`;
      }
    } else {
      // Если убираем родителя, slug должен быть без префикса
      if (dto.slug) {
        finalSlug = dto.slug;
      } else if (currentCategory.parentId && dto.parentId === null) {
        // Убираем префикс из существующего slug
        finalSlug = currentCategory.slug.split('/').pop() || currentCategory.slug;
      }
    }

    // Проверяем уникальность slug, если он меняется
    if (finalSlug !== currentCategory.slug) {
      const existing = await this.prisma.category.findUnique({
        where: { slug: finalSlug },
      });

      if (existing && existing.id !== id) {
        throw new BadRequestException(`Категория с таким slug уже существует: "${finalSlug}". Измените slug.`);
      }
    }

    return this.prisma.category.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        slug: finalSlug,
        ...(dto.sort !== undefined && { sort: dto.sort }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.imageUrl !== undefined && { imageUrl: dto.imageUrl }),
        ...(dto.parentId !== undefined && { parentId: parentId || null }),
      },
    });
  }

  @Delete(':id')
  async deleteCategory(@Param('id') id: string, @Req() req: { user?: { role: string } }) {
    this.checkAdminRole(req);

    // Проверяем, есть ли товары в этой категории
    const productsCount = await this.prisma.product.count({
      where: { categoryId: id },
    });

    if (productsCount > 0) {
      // Убираем категорию у товаров вместо удаления
      await this.prisma.product.updateMany({
        where: { categoryId: id },
        data: { categoryId: null },
      });
    }

    // Проверяем товары с этой подкатегорией
    const productsWithSubcategory = await this.prisma.product.count({
      where: { subcategoryId: id },
    });

    if (productsWithSubcategory > 0) {
      await this.prisma.product.updateMany({
        where: { subcategoryId: id },
        data: { subcategoryId: null },
      });
    }

    await this.prisma.category.delete({
      where: { id },
    });

    return { success: true };
  }
}
