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
    @Req() req: any,
  ) {
    this.checkAdminRole(req);

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [categories, total] = await Promise.all([
      this.prisma.category.findMany({
        skip,
        take: parseInt(limit),
        orderBy: { sort: 'asc' },
        include: {
          _count: {
            select: { products: true },
          },
        },
      }),
      this.prisma.category.count(),
    ]);

    return {
      data: categories,
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
        _count: {
          select: { products: true },
        },
      },
    });
  }

  @Post()
  async createCategory(@Body() dto: CreateCategoryDto, @Req() req: { user?: { role: string } }) {
    this.checkAdminRole(req);

    // Проверяем уникальность slug
    const existing = await this.prisma.category.findUnique({
      where: { slug: dto.slug },
    });

    if (existing) {
      throw new BadRequestException(`Категория с таким slug уже существует: "${dto.slug}". Измените slug.`);
    }

    return this.prisma.category.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        sort: dto.sort ?? 0,
        isActive: dto.isActive ?? true,
        imageUrl: dto.imageUrl,
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

    // Проверяем уникальность slug, если он меняется
    if (dto.slug) {
      const existing = await this.prisma.category.findUnique({
        where: { slug: dto.slug },
      });

      if (existing && existing.id !== id) {
        throw new BadRequestException(`Категория с таким slug уже существует: "${dto.slug}". Измените slug.`);
      }
    }

    return this.prisma.category.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.slug && { slug: dto.slug }),
        ...(dto.sort !== undefined && { sort: dto.sort }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.imageUrl !== undefined && { imageUrl: dto.imageUrl }),
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

    await this.prisma.category.delete({
      where: { id },
    });

    return { success: true };
  }
}
