/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Body,
  Controller,
  Get,
  Post,
  Delete,
  Param,
  UseGuards,
  Query,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { AdminGuard } from './admin.guard';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  ValidateNested,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';

// DTO для позиции в закупке
class BatchItemDto {
  @IsString()
  productId: string;

  @IsNumber()
  quantity: number;

  @IsNumber()
  purchasePrice: number; // Закупочная цена за единицу (целые рубли)

  @IsString()
  cellNumber: string; // Номер ячейки хранения

  @IsOptional()
  @IsDateString()
  expiryDate?: string; // Срок годности

  @IsOptional()
  @IsNumber()
  markupPercent?: number; // Наценка в %, если не указана — берётся из категории
}

// DTO для создания закупки
class CreatePurchaseDto {
  @IsOptional()
  @IsString()
  supplierName?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BatchItemDto)
  items: BatchItemDto[];
}

@Controller('admin/purchases')
@UseGuards(AdminGuard)
export class AdminPurchasesController {
  constructor(private prisma: PrismaService) {}

  // Генерация кода партии: "CELL PURCHASE_NUM PRODUCT_NUM"
  // Например: "24 00001 18"
  private generateBatchCode(
    cellNumber: string,
    purchaseNumber: number,
    productNumber: number,
  ): string {
    const paddedPurchase = String(purchaseNumber).padStart(5, '0');
    const paddedProduct = String(productNumber).padStart(2, '0');
    return `${cellNumber} ${paddedPurchase} ${paddedProduct}`;
  }

  // Получение порядкового номера товара (упрощённый ID)
  private async getProductNumber(productId: string): Promise<number> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { createdAt: true },
    });
    if (!product) return 0;

    // Считаем количество товаров, созданных до этого
    const count = await this.prisma.product.count({
      where: { createdAt: { lte: product.createdAt } },
    });
    return count;
  }

  // Пересчёт цены товара по активной партии (FIFO: ближайший срок годности)
  // Обновляет DarkstoreProduct для конкретного даркстора
  async recalculateProductPrice(
    productId: string,
    darkstoreId: string,
    tx?: any,
  ): Promise<void> {
    const db = tx || this.prisma;

    // Находим активную партию (FIFO — ближайший срок годности, затем по дате создания)
    // Фильтруем по даркстору через purchase
    const activeBatch = await db.batch.findFirst({
      where: {
        productId,
        status: 'ACTIVE',
        remainingQty: { gt: 0 },
        purchase: { darkstoreId },
      },
      orderBy: [{ expiryDate: 'asc' }, { createdAt: 'asc' }],
    });

    if (!activeBatch || activeBatch.sellingPrice === 0) {
      // Нет активной партии с ценой — не меняем цену
      return;
    }

    // Рассчитываем эффективную цену с учётом скидки
    let effectivePrice = activeBatch.sellingPrice;
    let oldPrice: number | null = null;

    if (activeBatch.discountPercent > 0) {
      effectivePrice = Math.round(
        activeBatch.sellingPrice * (1 - activeBatch.discountPercent / 100),
      );
      oldPrice = activeBatch.sellingPrice;
    }

    await db.darkstoreProduct.upsert({
      where: { productId_darkstoreId: { productId, darkstoreId } },
      update: {
        price: effectivePrice,
        oldPrice,
      },
      create: {
        productId,
        darkstoreId,
        price: effectivePrice,
        oldPrice,
      },
    });
  }

  // Получить список закупок
  @Get()
  async getPurchases(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Req() req?: any,
  ) {
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (req?.darkstoreId) where.darkstoreId = req.darkstoreId;

    const [purchases, total] = await Promise.all([
      this.prisma.purchase.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          batches: {
            include: {
              product: {
                select: { id: true, title: true, imageUrl: true },
              },
            },
          },
        },
      }),
      this.prisma.purchase.count({ where }),
    ]);

    return {
      data: purchases,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    };
  }

  // Получить закупку по ID
  @Get(':id')
  async getPurchase(@Param('id') id: string) {
    const purchase = await this.prisma.purchase.findUnique({
      where: { id },
      include: {
        batches: {
          include: {
            product: {
              select: {
                id: true,
                title: true,
                imageUrl: true,
                category: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });

    if (!purchase) {
      throw new BadRequestException('Закупка не найдена');
    }

    return purchase;
  }

  // Создать новую закупку
  @Post()
  async createPurchase(@Body() dto: CreatePurchaseDto, @Req() req?: any) {
    if (!req?.darkstoreId) {
      throw new BadRequestException('Darkstore not selected');
    }

    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Добавьте хотя бы одну позицию');
    }

    // Проверяем существование всех товаров
    const productIds = dto.items.map((item) => item.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      include: {
        category: { select: { id: true, markupPercent: true } },
        subcategory: { select: { id: true, markupPercent: true } },
      },
    });

    if (products.length !== productIds.length) {
      throw new BadRequestException('Некоторые товары не найдены');
    }

    // Строим карту товаров для быстрого доступа к наценке категории
    const productMap = new Map(products.map((p) => [p.id, p]));

    // Считаем общую сумму закупки
    const totalAmount = dto.items.reduce(
      (sum, item) => sum + item.purchasePrice * item.quantity,
      0,
    );

    // Создаём закупку с транзакцией
    const purchase = await this.prisma.$transaction(async (tx) => {
      // Создаём закупку
      const newPurchase = await tx.purchase.create({
        data: {
          supplierName: dto.supplierName,
          notes: dto.notes,
          totalAmount,
          darkstoreId: req.darkstoreId,
        },
      });

      // Создаём партии для каждого товара
      const affectedProductIds: string[] = [];

      for (const item of dto.items) {
        const product = productMap.get(item.productId);

        // Определяем наценку: из позиции → подкатегория → категория → 0
        const markupPercent =
          item.markupPercent ??
          product?.subcategory?.markupPercent ??
          product?.category?.markupPercent ??
          0;

        // Рассчитываем цену продажи с наценкой
        const sellingPrice = Math.round(
          item.purchasePrice * (1 + markupPercent / 100),
        );

        const productNumber = await this.getProductNumber(item.productId);
        const batchCode = this.generateBatchCode(
          item.cellNumber,
          newPurchase.purchaseNumber,
          productNumber,
        );

        await tx.batch.create({
          data: {
            batchCode,
            productId: item.productId,
            purchaseId: newPurchase.id,
            quantity: item.quantity,
            remainingQty: item.quantity,
            purchasePrice: item.purchasePrice,
            markupPercent,
            sellingPrice,
            cellNumber: item.cellNumber,
            expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
          },
        });

        // Обновляем остаток и закупочную цену в DarkstoreProduct
        await tx.darkstoreProduct.upsert({
          where: { productId_darkstoreId: { productId: item.productId, darkstoreId: req.darkstoreId } },
          update: {
            stock: { increment: item.quantity },
            purchasePrice: item.purchasePrice,
            cellNumber: item.cellNumber,
          },
          create: {
            productId: item.productId,
            darkstoreId: req.darkstoreId,
            stock: item.quantity,
            purchasePrice: item.purchasePrice,
            cellNumber: item.cellNumber,
          },
        });

        if (!affectedProductIds.includes(item.productId)) {
          affectedProductIds.push(item.productId);
        }
      }

      // Пересчитываем цену продажи для каждого затронутого товара
      for (const productId of affectedProductIds) {
        await this.recalculateProductPrice(productId, req.darkstoreId, tx);
      }

      return newPurchase;
    });

    // Возвращаем созданную закупку с деталями
    return this.getPurchase(purchase.id);
  }

  // Получить все партии товара
  @Get('product/:productId/batches')
  async getProductBatches(
    @Param('productId') productId: string,
    @Query('status') status?: string,
  ) {
    const where: any = { productId };
    if (status) {
      where.status = status;
    }

    const batches = await this.prisma.batch.findMany({
      where,
      orderBy: [{ expiryDate: 'asc' }, { createdAt: 'asc' }],
      include: {
        purchase: {
          select: { id: true, purchaseNumber: true, createdAt: true },
        },
      },
    });

    return batches;
  }

  // Получить информацию о партии
  @Get('batch/:batchId')
  async getBatch(@Param('batchId') batchId: string) {
    const batch = await this.prisma.batch.findUnique({
      where: { id: batchId },
      include: {
        product: {
          select: { id: true, title: true, imageUrl: true },
        },
        purchase: {
          select: { id: true, purchaseNumber: true, createdAt: true },
        },
      },
    });

    if (!batch) {
      throw new BadRequestException('Партия не найдена');
    }

    return batch;
  }

  // Получить партию по коду (для сканирования этикетки)
  @Get('batch/code/:code')
  async getBatchByCode(@Param('code') code: string) {
    const batch = await this.prisma.batch.findUnique({
      where: { batchCode: code },
      include: {
        product: {
          select: { id: true, title: true, imageUrl: true },
        },
        purchase: {
          select: { id: true, purchaseNumber: true, createdAt: true },
        },
      },
    });

    if (!batch) {
      throw new BadRequestException('Партия не найдена');
    }

    return batch;
  }

  // Выбор партии для продажи (FIFO - сначала с ближайшим сроком годности)
  @Get('product/:productId/fifo')
  async getNextBatchForSale(
    @Param('productId') productId: string,
    @Query('qty') qty = '1',
  ) {
    const requiredQty = parseInt(qty, 10) || 1;

    // Находим активные партии с остатком, отсортированные по сроку годности
    const batches = await this.prisma.batch.findMany({
      where: {
        productId,
        status: 'ACTIVE',
        remainingQty: { gt: 0 },
      },
      orderBy: [
        { expiryDate: 'asc' }, // Сначала те, что скоро истекают
        { createdAt: 'asc' }, // Затем по дате создания (FIFO)
      ],
      include: {
        purchase: {
          select: { purchaseNumber: true },
        },
      },
    });

    if (batches.length === 0) {
      return { batches: [], totalAvailable: 0, canFulfill: false };
    }

    // Собираем партии для выполнения заказа
    const selectedBatches: Array<{
      batchId: string;
      batchCode: string;
      cellNumber: string;
      qtyFromBatch: number;
      expiryDate: Date | null;
    }> = [];
    let remaining = requiredQty;

    for (const batch of batches) {
      if (remaining <= 0) break;

      const qtyFromBatch = Math.min(batch.remainingQty, remaining);
      selectedBatches.push({
        batchId: batch.id,
        batchCode: batch.batchCode,
        cellNumber: batch.cellNumber,
        qtyFromBatch,
        expiryDate: batch.expiryDate,
      });
      remaining -= qtyFromBatch;
    }

    const totalAvailable = batches.reduce((sum, b) => sum + b.remainingQty, 0);

    return {
      batches: selectedBatches,
      totalAvailable,
      canFulfill: remaining <= 0,
    };
  }

  // Удалить закупку (только если партии не использованы)
  @Delete(':id')
  async deletePurchase(@Param('id') id: string) {
    const purchase = await this.prisma.purchase.findUnique({
      where: { id },
      include: {
        batches: {
          include: {
            orderItems: true,
          },
        },
      },
    });

    if (!purchase) {
      throw new BadRequestException('Закупка не найдена');
    }

    // Проверяем, что партии не использованы в заказах
    const hasOrders = purchase.batches.some((b) => b.orderItems.length > 0);
    if (hasOrders) {
      throw new BadRequestException(
        'Невозможно удалить: партии уже использованы в заказах',
      );
    }

    // Удаляем с откатом остатков
    await this.prisma.$transaction(async (tx) => {
      const affectedProductIds: string[] = [];

      for (const batch of purchase.batches) {
        await tx.darkstoreProduct.updateMany({
          where: { productId: batch.productId, darkstoreId: purchase.darkstoreId },
          data: {
            stock: { decrement: batch.remainingQty },
          },
        });
        if (!affectedProductIds.includes(batch.productId)) {
          affectedProductIds.push(batch.productId);
        }
      }

      await tx.purchase.delete({
        where: { id },
      });

      // Пересчитываем цены затронутых товаров
      for (const productId of affectedProductIds) {
        await this.recalculateProductPrice(productId, purchase.darkstoreId, tx);
      }
    });

    return { success: true };
  }
}
