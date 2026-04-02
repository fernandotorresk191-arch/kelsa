import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { AdminGuard } from './admin.guard';
import { IsBoolean, IsOptional, IsString, IsNumber } from 'class-validator';

class CreateCategoryDto {
  @IsString()
  name: string;

  @IsString()
  slug: string;

  @IsOptional()
  @IsString()
  description?: string;

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

  @IsOptional()
  @IsNumber()
  markupPercent?: number;
}

class UpdateCategoryDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  description?: string;

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

  @IsOptional()
  @IsNumber()
  markupPercent?: number;
}

@Controller('v1/admin/categories')
@UseGuards(AdminGuard)
export class AdminCategoriesController {
  constructor(private prisma: PrismaService) {}

  // ─── GET / — глобальный список категорий с per-darkstore статусом ──────────
  @Get()
  async getCategories(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '50',
    @Query('parentId') parentId?: string,
    @Req() req?: any,
  ) {
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where: any = {};
    if (parentId !== undefined) {
      where.parentId = parentId === 'null' ? null : parentId;
    }

    const [categories, total] = await Promise.all([
      this.prisma.category.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { sort: 'asc' },
        include: {
          parent: true,
          subcategories: true,
          _count: {
            select: {
              products: true,
              subcategories: true,
            },
          },
          darkstoreCategories: req?.darkstoreId
            ? { where: { darkstoreId: req.darkstoreId }, select: { isActive: true } }
            : false,
        },
      }),
      this.prisma.category.count({ where }),
    ]);

    // Подсчитываем товары с учетом subcategoryId для подкатегорий
    const categoriesWithProductCount = await Promise.all(
      categories.map(async (category) => {
        const productCount = await this.prisma.product.count({
          where: category.parentId
            ? { subcategoryId: category.id }
            : { categoryId: category.id },
        });

        const dc = (category as any).darkstoreCategories?.[0];
        return {
          ...category,
          darkstoreCategories: undefined,
          darkstoreActive: dc ? dc.isActive : null,
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

  // ─── GET check-slug/:slug — глобальная проверка уникальности ─────────────
  @Get('check-slug/:slug')
  async checkSlug(
    @Param('slug') slug: string,
    @Query('excludeId') excludeId?: string,
  ) {
    const existing = await this.prisma.category.findUnique({ where: { slug } });
    const isAvailable = !existing || (excludeId ? existing.id === excludeId : false);
    return { available: isAvailable, existingId: isAvailable ? null : existing?.id };
  }

  // ─── GET :id — одна категория ─────────────────────────────────────────────
  @Get(':id')
  async getCategoryById(@Param('id') id: string) {
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

  // ─── POST / — создать глобальную категорию ───────────────────────────────
  @Post()
  async createCategory(@Body() dto: CreateCategoryDto, @Req() req: any) {
    let finalSlug = dto.slug;

    if (dto.parentId) {
      const parent = await this.prisma.category.findUnique({
        where: { id: dto.parentId },
      });
      if (!parent) {
        throw new BadRequestException('Родительская категория не найдена');
      }
      finalSlug = `${parent.slug}/${dto.slug}`;
    }

    const existing = await this.prisma.category.findUnique({ where: { slug: finalSlug } });
    if (existing) {
      throw new BadRequestException(`Категория с таким slug уже существует: "${finalSlug}". Измените slug.`);
    }

    // Создаём глобальную категорию
    const category = await this.prisma.category.create({
      data: {
        name: dto.name,
        slug: finalSlug,
        description: dto.description || null,
        sort: dto.sort ?? 0,
        isActive: dto.isActive ?? true,
        imageUrl: dto.imageUrl,
        parentId: dto.parentId || null,
        markupPercent: dto.markupPercent ?? 0,
      },
    });

    // Автоматически добавляем в все существующие дарксторы
    const darkstores = await this.prisma.darkstore.findMany({ select: { id: true } });
    if (darkstores.length > 0) {
      await this.prisma.darkstoreCategory.createMany({
        data: darkstores.map((ds) => ({
          categoryId: category.id,
          darkstoreId: ds.id,
          isActive: true,
        })),
        skipDuplicates: true,
      });
    }

    return category;
  }

  // ─── PUT :id — изменить глобальную категорию ─────────────────────────────
  @Put(':id')
  async updateCategory(
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
    @Req() req: any,
  ) {
    const currentCategory = await this.prisma.category.findUnique({
      where: { id },
      include: { parent: true },
    });

    if (!currentCategory) {
      throw new BadRequestException('Категория не найдена');
    }

    let finalSlug = dto.slug || currentCategory.slug;
    let parentId = dto.parentId !== undefined ? dto.parentId : currentCategory.parentId;

    if (parentId) {
      const parent = await this.prisma.category.findUnique({ where: { id: parentId } });
      if (!parent) {
        throw new BadRequestException('Родительская категория не найдена');
      }
      if (parentId === id) {
        throw new BadRequestException('Категория не может быть родителем самой себя');
      }
      if (dto.slug || dto.parentId !== undefined) {
        const baseSlug = dto.slug || currentCategory.slug.split('/').pop() || currentCategory.slug;
        finalSlug = `${parent.slug}/${baseSlug}`;
      }
    } else {
      if (dto.slug) {
        finalSlug = dto.slug;
      } else if (currentCategory.parentId && dto.parentId === null) {
        finalSlug = currentCategory.slug.split('/').pop() || currentCategory.slug;
      }
    }

    if (finalSlug !== currentCategory.slug) {
      const existing = await this.prisma.category.findUnique({ where: { slug: finalSlug } });
      if (existing && existing.id !== id) {
        throw new BadRequestException(`Категория с таким slug уже существует: "${finalSlug}". Измените slug.`);
      }
    }

    return this.prisma.category.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        slug: finalSlug,
        ...(dto.description !== undefined && { description: dto.description || null }),
        ...(dto.sort !== undefined && { sort: dto.sort }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.imageUrl !== undefined && { imageUrl: dto.imageUrl }),
        ...(dto.parentId !== undefined && { parentId: parentId || null }),
        ...(dto.markupPercent !== undefined && { markupPercent: dto.markupPercent }),
      },
    });
  }

  // ─── PATCH :id/toggle — включить/выключить категорию в даркстор ──────────
  @Patch(':id/toggle')
  async toggleDarkstoreCategory(@Param('id') id: string, @Req() req: any) {
    if (!req.darkstoreId) {
      throw new BadRequestException('Darkstore not selected');
    }

    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) throw new BadRequestException('Категория не найдена');

    const existing = await this.prisma.darkstoreCategory.findUnique({
      where: { categoryId_darkstoreId: { categoryId: id, darkstoreId: req.darkstoreId } },
    });

    if (existing) {
      const updated = await this.prisma.darkstoreCategory.update({
        where: { categoryId_darkstoreId: { categoryId: id, darkstoreId: req.darkstoreId } },
        data: { isActive: !existing.isActive },
      });
      return { darkstoreActive: updated.isActive };
    } else {
      // Первый раз — создаём запись (по умолчанию активна)
      const created = await this.prisma.darkstoreCategory.create({
        data: { categoryId: id, darkstoreId: req.darkstoreId, isActive: true },
      });
      return { darkstoreActive: created.isActive };
    }
  }

  // ─── DELETE :id — удалить глобальную категорию ───────────────────────────
  @Delete(':id')
  async deleteCategory(@Param('id') id: string) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) throw new BadRequestException('Категория не найдена');

    await this.prisma.product.updateMany({
      where: { categoryId: id },
      data: { categoryId: null },
    });

    await this.prisma.product.updateMany({
      where: { subcategoryId: id },
      data: { subcategoryId: null },
    });

    await this.prisma.category.delete({ where: { id } });

    return { success: true };
  }
}
