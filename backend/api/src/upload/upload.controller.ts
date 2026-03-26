/* eslint-disable prettier/prettier */
import {
  Controller,
  Post,
  Delete,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Param,
  BadRequestException,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join, basename } from 'path';
import { existsSync, unlinkSync, mkdirSync } from 'fs';
import { JwtGuard } from '../auth/jwt.guard';
import { randomUUID } from 'crypto';
import { PrismaService } from 'prisma/prisma.service';

interface AuthRequest {
  user: { role?: string };
}

// Создаём директории для uploads если не существуют
const UPLOAD_DIR = join(process.cwd(), 'uploads');
const PRODUCTS_DIR = join(UPLOAD_DIR, 'products');
const CATEGORIES_DIR = join(UPLOAD_DIR, 'categories');
const PROMOTIONS_DIR = join(UPLOAD_DIR, 'promotions');

[UPLOAD_DIR, PRODUCTS_DIR, CATEGORIES_DIR, PROMOTIONS_DIR].forEach((dir) => {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
});

// Валидация типов файлов
const imageFileFilter = (
  _req: Express.Request,
  file: Express.Multer.File,
  callback: (error: Error | null, acceptFile: boolean) => void,
) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (allowedMimes.includes(file.mimetype)) {
    callback(null, true);
  } else {
    callback(
      new BadRequestException(
        'Разрешены только изображения (jpg, png, webp, gif)',
      ),
      false,
    );
  }
};

// Генерация уникального имени файла
const generateFilename = (
  _req: Express.Request,
  file: Express.Multer.File,
  callback: (error: Error | null, filename: string) => void,
) => {
  const uniqueName = `${randomUUID()}${extname(file.originalname)}`;
  callback(null, uniqueName);
};

@Controller('v1/upload')
@UseGuards(JwtGuard)
export class UploadController {
  constructor(private prisma: PrismaService) {}

  private checkAdminRole(req: AuthRequest) {
    if (req.user?.role !== 'admin' && req.user?.role !== 'manager' && req.user?.role !== 'superadmin') {
      throw new UnauthorizedException('Admin access required');
    }
  }

  @Post('product/:productId')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: PRODUCTS_DIR,
        filename: generateFilename,
      }),
      fileFilter: imageFileFilter,
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB max
      },
    }),
  )
  async uploadProductImage(
    @Param('productId') productId: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: AuthRequest,
  ) {
    this.checkAdminRole(req);
    
    if (!file) {
      throw new BadRequestException('Файл не загружен');
    }

    // Удаляем старый файл если есть
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { imageUrl: true },
    });
    
    if (product?.imageUrl?.startsWith('/uploads/products/')) {
      const oldFilename = basename(product.imageUrl);
      const oldPath = join(PRODUCTS_DIR, oldFilename);
      if (existsSync(oldPath)) {
        try {
          unlinkSync(oldPath);
        } catch {
          // Игнорируем ошибки удаления старого файла
        }
      }
    }

    const imageUrl = `/uploads/products/${file.filename}`;
    
    // Обновляем imageUrl в БД
    await this.prisma.product.update({
      where: { id: productId },
      data: { imageUrl },
    });

    return {
      imageUrl,
      filename: file.filename,
      originalName: file.originalname,
      size: file.size,
    };
  }

  @Post('category/:categoryId')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: CATEGORIES_DIR,
        filename: generateFilename,
      }),
      fileFilter: imageFileFilter,
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB max
      },
    }),
  )
  async uploadCategoryImage(
    @Param('categoryId') categoryId: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: AuthRequest,
  ) {
    this.checkAdminRole(req);
    
    if (!file) {
      throw new BadRequestException('Файл не загружен');
    }

    // Удаляем старый файл если есть
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
      select: { imageUrl: true },
    });
    
    if (category?.imageUrl?.startsWith('/uploads/categories/')) {
      const oldFilename = basename(category.imageUrl);
      const oldPath = join(CATEGORIES_DIR, oldFilename);
      if (existsSync(oldPath)) {
        try {
          unlinkSync(oldPath);
        } catch {
          // Игнорируем ошибки удаления старого файла
        }
      }
    }

    const imageUrl = `/uploads/categories/${file.filename}`;
    
    // Обновляем imageUrl в БД
    await this.prisma.category.update({
      where: { id: categoryId },
      data: { imageUrl },
    });

    return {
      imageUrl,
      filename: file.filename,
      originalName: file.originalname,
      size: file.size,
    };
  }

  @Delete('product/:productId')
  async deleteProductImage(
    @Param('productId') productId: string,
    @Req() req: AuthRequest,
  ) {
    this.checkAdminRole(req);
    
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { imageUrl: true },
    });

    if (!product) {
      throw new BadRequestException('Товар не найден');
    }

    if (product.imageUrl?.startsWith('/uploads/products/')) {
      const filename = basename(product.imageUrl);
      const filePath = join(PRODUCTS_DIR, filename);
      
      if (existsSync(filePath)) {
        try {
          unlinkSync(filePath);
        } catch {
          // Игнорируем ошибки удаления файла
        }
      }
    }

    // Очищаем imageUrl в БД
    await this.prisma.product.update({
      where: { id: productId },
      data: { imageUrl: null },
    });

    return { success: true, message: 'Изображение удалено' };
  }

  @Delete('category/:categoryId')
  async deleteCategoryImage(
    @Param('categoryId') categoryId: string,
    @Req() req: AuthRequest,
  ) {
    this.checkAdminRole(req);
    
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
      select: { imageUrl: true },
    });

    if (!category) {
      throw new BadRequestException('Категория не найдена');
    }

    if (category.imageUrl?.startsWith('/uploads/categories/')) {
      const filename = basename(category.imageUrl);
      const filePath = join(CATEGORIES_DIR, filename);
      
      if (existsSync(filePath)) {
        try {
          unlinkSync(filePath);
        } catch {
          // Игнорируем ошибки удаления файла
        }
      }
    }

    // Очищаем imageUrl в БД
    await this.prisma.category.update({
      where: { id: categoryId },
      data: { imageUrl: null },
    });

    return { success: true, message: 'Изображение удалено' };
  }

  @Post('promotion/:promotionId')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: PROMOTIONS_DIR,
        filename: generateFilename,
      }),
      fileFilter: imageFileFilter,
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB max
      },
    }),
  )
  async uploadPromotionImage(
    @Param('promotionId') promotionId: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: AuthRequest,
  ) {
    this.checkAdminRole(req);
    
    if (!file) {
      throw new BadRequestException('Файл не загружен');
    }

    // Удаляем старый файл если есть
    const promotion = await this.prisma.promotion.findUnique({
      where: { id: promotionId },
      select: { imageUrl: true },
    });
    
    if (promotion?.imageUrl?.startsWith('/uploads/promotions/')) {
      const oldFilename = basename(promotion.imageUrl);
      const oldPath = join(PROMOTIONS_DIR, oldFilename);
      if (existsSync(oldPath)) {
        try {
          unlinkSync(oldPath);
        } catch {
          // Игнорируем ошибки удаления старого файла
        }
      }
    }

    const imageUrl = `/uploads/promotions/${file.filename}`;
    
    // Обновляем imageUrl в БД
    await this.prisma.promotion.update({
      where: { id: promotionId },
      data: { imageUrl },
    });

    return {
      imageUrl,
      filename: file.filename,
      originalName: file.originalname,
      size: file.size,
    };
  }

  @Delete('promotion/:promotionId')
  async deletePromotionImage(
    @Param('promotionId') promotionId: string,
    @Req() req: AuthRequest,
  ) {
    this.checkAdminRole(req);
    
    const promotion = await this.prisma.promotion.findUnique({
      where: { id: promotionId },
      select: { imageUrl: true },
    });

    if (!promotion) {
      throw new BadRequestException('Промо не найдено');
    }

    if (promotion.imageUrl?.startsWith('/uploads/promotions/')) {
      const filename = basename(promotion.imageUrl);
      const filePath = join(PROMOTIONS_DIR, filename);
      
      if (existsSync(filePath)) {
        try {
          unlinkSync(filePath);
        } catch {
          // Игнорируем ошибки удаления файла
        }
      }
    }

    // Очищаем imageUrl в БД
    await this.prisma.promotion.update({
      where: { id: promotionId },
      data: { imageUrl: '' },
    });

    return { success: true, message: 'Изображение удалено' };
  }
}
