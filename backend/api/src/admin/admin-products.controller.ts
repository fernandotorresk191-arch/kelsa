import {
  Body,
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Param,
  UseGuards,
  Req,
  UnauthorizedException,
  BadRequestException,
  Query,
} from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { JwtGuard } from '../auth/jwt.guard';
import { IsString, IsOptional, IsNumber, MinLength } from 'class-validator';

class CreateProductDto {
  @IsString()
  @MinLength(3)
  title: string;

  @IsString()
  @MinLength(3)
  slug: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsNumber()
  weightGr?: number;

  @IsNumber()
  price: number; // в целых рублях

  @IsOptional()
  @IsNumber()
  oldPrice?: number;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  subcategoryId?: string;

  @IsOptional()
  @IsNumber()
  stock: number;

  @IsOptional()
  @IsString()
  cellNumber?: string;
}

class UpdateProductDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  slug?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsNumber()
  weightGr?: number;

  @IsOptional()
  @IsNumber()
  price?: number;

  @IsOptional()
  @IsNumber()
  oldPrice?: number;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  subcategoryId?: string;

  @IsOptional()
  @IsNumber()
  stock?: number;

  @IsOptional()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  cellNumber?: string;
}

class UpdateStockDto {
  @IsNumber()
  quantity: number; // новое количество, не дельта
}

interface AuthRequest {
  user: { role: string };
}

@Controller('v1/admin/products')
@UseGuards(JwtGuard)
export class AdminProductsController {
  constructor(private prisma: PrismaService) {}

  private checkAdminRole(req: AuthRequest) {
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      throw new UnauthorizedException('Admin access required');
    }
  }

  @Get()
  async getProducts(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Query('categoryId') categoryId?: string,
    @Query('search') search?: string,
    @Req() req?: AuthRequest,
  ) {
    this.checkAdminRole(req as AuthRequest);

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Формируем условия поиска
    const where: {
      categoryId?: string;
      subcategoryId?: string;
      OR?: Array<{
        title?: { contains: string; mode: 'insensitive' };
        slug?: { contains: string; mode: 'insensitive' };
        cellNumber?: { contains: string; mode: 'insensitive' };
      }>;
    } = {};
    
    if (categoryId) {
      // Проверяем, является ли переданный ID подкатегорией
      const category = await this.prisma.category.findUnique({
        where: { id: categoryId },
        select: { parentId: true },
      });
      
      if (category?.parentId) {
        // Это подкатегория - фильтруем по subcategoryId
        where.subcategoryId = categoryId;
      } else {
        // Это корневая категория - фильтруем по categoryId
        where.categoryId = categoryId;
      }
    }
    
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
        { cellNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: parseInt(limit),
        include: { category: true, subcategory: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      data: products,
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
    @Req() req?: AuthRequest,
  ) {
    this.checkAdminRole(req as AuthRequest);

    const existing = await this.prisma.product.findUnique({
      where: { slug },
    });

    const isAvailable = !existing || (excludeId && existing.id === excludeId);
    return {
      available: isAvailable,
      existingId: isAvailable ? null : existing?.id,
    };
  }

  @Get(':id')
  async getProductById(@Param('id') id: string, @Req() req: AuthRequest) {
    this.checkAdminRole(req);

    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { category: true, subcategory: true },
    });

    if (!product) {
      throw new Error('Product not found');
    }

    return product;
  }

  @Post()
  async createProduct(@Body() dto: CreateProductDto, @Req() req: AuthRequest) {
    this.checkAdminRole(req);

    // Проверяем, что slug уникален
    const existing = await this.prisma.product.findUnique({
      where: { slug: dto.slug },
    });

    if (existing) {
      throw new BadRequestException(
        `Товар с таким slug уже существует: "${dto.slug}". Измените slug.`,
      );
    }

    const product = await this.prisma.product.create({
      data: {
        title: dto.title,
        slug: dto.slug,
        description: dto.description,
        imageUrl: dto.imageUrl,
        weightGr: dto.weightGr,
        price: dto.price,
        oldPrice: dto.oldPrice,
        categoryId: dto.categoryId,
        subcategoryId: dto.subcategoryId,
        cellNumber: dto.cellNumber,
      },
      include: { category: true, subcategory: true },
    });

    return product;
  }

  @Put(':id')
  async updateProduct(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
    @Req() req: AuthRequest,
  ) {
    this.checkAdminRole(req);

    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw new Error('Product not found');
    }

    // Проверяем уникальность slug, если он меняется
    if (dto.slug) {
      const existingWithSlug = await this.prisma.product.findUnique({
        where: { slug: dto.slug },
      });

      if (existingWithSlug && existingWithSlug.id !== id) {
        throw new BadRequestException(
          `Товар с таким slug уже существует: "${dto.slug}". Измените slug.`,
        );
      }
    }

    const updated = await this.prisma.product.update({
      where: { id },
      data: dto,
      include: { category: true, subcategory: true },
    });

    return updated;
  }

  @Delete(':id')
  async deleteProduct(@Param('id') id: string, @Req() req: AuthRequest) {
    this.checkAdminRole(req);

    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw new Error('Product not found');
    }

    // Мягкое удаление - просто отключаем товар
    await this.prisma.product.update({
      where: { id },
      data: { isActive: false },
    });

    return { success: true, message: 'Product disabled' };
  }

  @Patch(':id/stock')
  async updateStock(
    @Param('id') id: string,
    @Body() dto: UpdateStockDto,
    @Req() req: AuthRequest,
  ) {
    this.checkAdminRole(req);

    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw new Error('Product not found');
    }

    const updated = await this.prisma.product.update({
      where: { id },
      data: { stock: dto.quantity },
    });

    return { success: true, stock: updated.stock };
  }
}
