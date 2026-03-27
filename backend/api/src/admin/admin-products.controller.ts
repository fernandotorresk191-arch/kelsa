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
import { AdminGuard } from './admin.guard';
import { IsString, IsOptional, IsNumber, MinLength, IsBoolean } from 'class-validator';

// DTO для создания глобального товара + привязки к даркстору
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
  @IsString()
  weight?: string;

  @IsOptional()
  @IsString()
  barcode?: string;

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

// DTO для обновления глобальных полей товара
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
  @IsString()
  weight?: string;

  @IsOptional()
  @IsString()
  barcode?: string;

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
  darkstoreId: string | null;
}

// Хелпер: собрать «плоский» продукт с данными из DarkstoreProduct (для совместимости с фронтом)
function flattenProduct(product: any, dp?: any) {
  return {
    ...product,
    price: dp?.price ?? 0,
    oldPrice: dp?.oldPrice ?? null,
    purchasePrice: dp?.purchasePrice ?? null,
    stock: dp?.stock ?? 0,
    cellNumber: dp?.cellNumber ?? null,
    // Категория берётся из DarkstoreProduct если есть, иначе из Product
    categoryId: dp?.categoryId ?? product.categoryId,
    subcategoryId: dp?.subcategoryId ?? product.subcategoryId,
    category: dp?.category ?? product.category,
    subcategory: dp?.subcategory ?? product.subcategory,
    darkstoreProductId: dp?.id ?? null,
    isActiveInDarkstore: dp?.isActive ?? false,
  };
}

@Controller('v1/admin/products')
@UseGuards(AdminGuard)
export class AdminProductsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async getProducts(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Query('categoryId') categoryId?: string,
    @Query('search') search?: string,
    @Req() req?: AuthRequest,
  ) {
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Всегда запрашиваем глобальные товары, обогащаем данными DarkstoreProduct если даркстор выбран
    const where: any = {};

    if (categoryId) {
      const category = await this.prisma.category.findUnique({
        where: { id: categoryId },
        select: { parentId: true },
      });
      if (category?.parentId) {
        where.subcategoryId = categoryId;
      } else {
        where.categoryId = categoryId;
      }
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
        { barcode: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: parseInt(limit),
        include: {
          category: true,
          subcategory: true,
          darkstoreProducts: req?.darkstoreId
            ? { where: { darkstoreId: req.darkstoreId }, include: { category: true, subcategory: true } }
            : false,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      data: products.map((p) => {
        const dp = req?.darkstoreId ? (p as any).darkstoreProducts?.[0] ?? null : null;
        const { darkstoreProducts, ...product } = p as any;
        return req?.darkstoreId ? flattenProduct(product, dp) : product;
      }),
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
  ) {
    // Slug теперь глобально уникален
    const existing = await this.prisma.product.findUnique({ where: { slug } });

    const isAvailable = !existing || (excludeId && existing.id === excludeId);
    return {
      available: isAvailable,
      existingId: isAvailable ? null : existing?.id,
    };
  }

  @Get(':id')
  async getProductById(@Param('id') id: string, @Req() req: AuthRequest) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { category: true, subcategory: true },
    });

    if (!product) {
      throw new BadRequestException('Product not found');
    }

    // Если выбран даркстор — подтягиваем per-darkstore данные
    if (req.darkstoreId) {
      const dp = await this.prisma.darkstoreProduct.findUnique({
        where: { productId_darkstoreId: { productId: id, darkstoreId: req.darkstoreId } },
        include: { category: true, subcategory: true },
      });
      return flattenProduct(product, dp);
    }

    return product;
  }

  @Post()
  async createProduct(@Body() dto: CreateProductDto, @Req() req: AuthRequest) {
    if (!req.darkstoreId) {
      throw new BadRequestException('Darkstore not selected');
    }

    // Проверяем глобальную уникальность slug
    const existing = await this.prisma.product.findUnique({
      where: { slug: dto.slug },
    });

    if (existing) {
      throw new BadRequestException(
        `Товар с таким slug уже существует: "${dto.slug}". Измените slug.`,
      );
    }

    // Создаём глобальный товар + привязку к даркстору в транзакции
    const result = await this.prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          title: dto.title,
          slug: dto.slug,
          description: dto.description,
          imageUrl: dto.imageUrl,
          weight: dto.weight,
          barcode: dto.barcode,
          categoryId: dto.categoryId,
          subcategoryId: dto.subcategoryId,
        },
        include: { category: true, subcategory: true },
      });

      const dp = await tx.darkstoreProduct.create({
        data: {
          productId: product.id,
          darkstoreId: req.darkstoreId!,
          price: dto.price,
          oldPrice: dto.oldPrice,
          stock: dto.stock ?? 0,
          cellNumber: dto.cellNumber,
          categoryId: dto.categoryId,
          subcategoryId: dto.subcategoryId,
        },
        include: { category: true, subcategory: true },
      });

      return flattenProduct(product, dp);
    });

    return result;
  }

  @Put(':id')
  async updateProduct(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
    @Req() req: AuthRequest,
  ) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw new BadRequestException('Product not found');
    }

    // Проверяем глобальную уникальность slug, если он меняется
    if (dto.slug && dto.slug !== product.slug) {
      const existingWithSlug = await this.prisma.product.findUnique({
        where: { slug: dto.slug },
      });

      if (existingWithSlug && existingWithSlug.id !== id) {
        throw new BadRequestException(
          `Товар с таким slug уже существует: "${dto.slug}". Измените slug.`,
        );
      }
    }

    // Разделяем глобальные и per-darkstore поля
    const globalData: any = {};
    if (dto.title !== undefined) globalData.title = dto.title;
    if (dto.slug !== undefined) globalData.slug = dto.slug;
    if (dto.description !== undefined) globalData.description = dto.description;
    if (dto.imageUrl !== undefined) globalData.imageUrl = dto.imageUrl;
    if (dto.weight !== undefined) globalData.weight = dto.weight;
    if (dto.barcode !== undefined) globalData.barcode = dto.barcode;
    if (dto.isActive !== undefined) globalData.isActive = dto.isActive;
    // Обновляем дефолтную категорию на товаре
    if (dto.categoryId !== undefined) globalData.categoryId = dto.categoryId;
    if (dto.subcategoryId !== undefined) globalData.subcategoryId = dto.subcategoryId;

    const perDarkstoreData: any = {};
    if (dto.price !== undefined) perDarkstoreData.price = dto.price;
    if (dto.oldPrice !== undefined) perDarkstoreData.oldPrice = dto.oldPrice;
    if (dto.stock !== undefined) perDarkstoreData.stock = dto.stock;
    if (dto.cellNumber !== undefined) perDarkstoreData.cellNumber = dto.cellNumber;
    if (dto.categoryId !== undefined) perDarkstoreData.categoryId = dto.categoryId;
    if (dto.subcategoryId !== undefined) perDarkstoreData.subcategoryId = dto.subcategoryId;

    const result = await this.prisma.$transaction(async (tx) => {
      // Обновляем глобальные поля
      const updated = await tx.product.update({
        where: { id },
        data: Object.keys(globalData).length > 0 ? globalData : undefined,
        include: { category: true, subcategory: true },
      });

      // Обновляем per-darkstore поля (если даркстор выбран)
      let dp: any = null;
      if (req.darkstoreId && Object.keys(perDarkstoreData).length > 0) {
        dp = await tx.darkstoreProduct.upsert({
          where: { productId_darkstoreId: { productId: id, darkstoreId: req.darkstoreId } },
          update: perDarkstoreData,
          create: {
            productId: id,
            darkstoreId: req.darkstoreId,
            ...perDarkstoreData,
          },
          include: { category: true, subcategory: true },
        });
      } else if (req.darkstoreId) {
        dp = await tx.darkstoreProduct.findUnique({
          where: { productId_darkstoreId: { productId: id, darkstoreId: req.darkstoreId } },
          include: { category: true, subcategory: true },
        });
      }

      return flattenProduct(updated, dp);
    });

    return result;
  }

  @Delete(':id')
  async deleteProduct(@Param('id') id: string, @Req() req: AuthRequest) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw new BadRequestException('Product not found');
    }

    // Мягкое удаление: если даркстор выбран — отключаем только в этом дарксторе
    if (req.darkstoreId) {
      await this.prisma.darkstoreProduct.updateMany({
        where: { productId: id, darkstoreId: req.darkstoreId },
        data: { isActive: false },
      });
      return { success: true, message: 'Product disabled in this darkstore' };
    }

    // Суперадмин без даркстора — глобальное отключение
    await this.prisma.product.update({
      where: { id },
      data: { isActive: false },
    });

    return { success: true, message: 'Product disabled globally' };
  }

  @Patch(':id/stock')
  async updateStock(
    @Param('id') id: string,
    @Body() dto: UpdateStockDto,
    @Req() req: AuthRequest,
  ) {
    if (!req.darkstoreId) {
      throw new BadRequestException('Darkstore not selected — stock is per-darkstore');
    }

    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw new BadRequestException('Product not found');
    }

    const dp = await this.prisma.darkstoreProduct.upsert({
      where: { productId_darkstoreId: { productId: id, darkstoreId: req.darkstoreId } },
      update: { stock: dto.quantity },
      create: { productId: id, darkstoreId: req.darkstoreId, stock: dto.quantity },
    });

    return { success: true, stock: dp.stock };
  }

  // Добавить существующий товар в даркстор
  @Post(':id/add-to-darkstore')
  async addProductToDarkstore(@Param('id') id: string, @Req() req: AuthRequest) {
    if (!req.darkstoreId) {
      throw new BadRequestException('Darkstore not selected');
    }

    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { category: true, subcategory: true },
    });
    if (!product) {
      throw new BadRequestException('Product not found');
    }

    // Проверяем, не привязан ли уже
    const existing = await this.prisma.darkstoreProduct.findUnique({
      where: { productId_darkstoreId: { productId: id, darkstoreId: req.darkstoreId } },
    });
    if (existing) {
      throw new BadRequestException('Товар уже добавлен в этот даркстор');
    }

    const dp = await this.prisma.darkstoreProduct.create({
      data: {
        productId: id,
        darkstoreId: req.darkstoreId,
        categoryId: product.categoryId,
        subcategoryId: product.subcategoryId,
      },
      include: { category: true, subcategory: true },
    });

    return flattenProduct(product, dp);
  }
}
