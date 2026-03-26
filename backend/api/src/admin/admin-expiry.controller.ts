/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  Query,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { AdminGuard } from './admin.guard';
import { IsString, IsNumber, IsOptional } from 'class-validator';
import { AdminPurchasesController } from './admin-purchases.controller';

class WriteOffDto {
  @IsString()
  batchId: string;

  @IsNumber()
  quantity: number;

  @IsOptional()
  @IsString()
  reason?: string;
}

class SetDiscountDto {
  @IsNumber()
  discountPercent: number; // 0–100
}

interface AuthRequest {
  user: { role?: string };
  darkstoreId: string | null;
}

@Controller('admin/expiry')
@UseGuards(AdminGuard)
export class AdminExpiryController {
  constructor(
    private prisma: PrismaService,
    private purchasesController: AdminPurchasesController,
  ) {}

  private getDarkstoreFilter(req?: AuthRequest) {
    if (req?.darkstoreId) {
      return { purchase: { darkstoreId: req.darkstoreId } };
    }
    return {};
  }

  // Получить партии с истекающим сроком годности (в течение 7 дней)
  @Get('expiring')
  async getExpiringBatches(@Query('days') days = '7', @Req() req?: AuthRequest) {
    const daysNum = parseInt(days, 10) || 7;
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + daysNum);

    const batches = await this.prisma.batch.findMany({
      where: {
        status: 'ACTIVE',
        remainingQty: { gt: 0 },
        expiryDate: {
          not: null,
          lte: futureDate,
          gte: today, // Ещё не просрочены
        },
        ...this.getDarkstoreFilter(req),
      },
      orderBy: { expiryDate: 'asc' },
      include: {
        product: {
          select: {
            id: true,
            title: true,
            imageUrl: true,
            cellNumber: true,
            price: true,
          },
        },
        purchase: {
          select: { purchaseNumber: true },
        },
      },
    });

    return {
      data: batches,
      total: batches.length,
      daysThreshold: daysNum,
    };
  }

  // Получить уже просроченные партии
  @Get('expired')
  async getExpiredBatches(@Req() req?: AuthRequest) {
    const today = new Date();

    const batches = await this.prisma.batch.findMany({
      where: {
        status: { in: ['ACTIVE', 'EXPIRED'] },
        remainingQty: { gt: 0 },
        expiryDate: {
          not: null,
          lt: today,
        },
        ...this.getDarkstoreFilter(req),
      },
      orderBy: { expiryDate: 'asc' },
      include: {
        product: {
          select: {
            id: true,
            title: true,
            imageUrl: true,
            cellNumber: true,
            price: true,
          },
        },
        purchase: {
          select: { purchaseNumber: true },
        },
      },
    });

    // Автоматически обновляем статус на EXPIRED
    const expiredIds = batches
      .filter((b) => b.status === 'ACTIVE')
      .map((b) => b.id);

    if (expiredIds.length > 0) {
      await this.prisma.batch.updateMany({
        where: { id: { in: expiredIds } },
        data: { status: 'EXPIRED' },
      });
    }

    return {
      data: batches,
      total: batches.length,
    };
  }

  // Установить скидку на партию (для товаров с истекающим сроком)
  @Patch('batch/:batchId/discount')
  async setDiscount(
    @Param('batchId') batchId: string,
    @Body() dto: SetDiscountDto,
  ) {
    if (dto.discountPercent < 0 || dto.discountPercent > 100) {
      throw new BadRequestException('Скидка должна быть от 0 до 100%');
    }

    const batch = await this.prisma.batch.findUnique({
      where: { id: batchId },
      include: {
        product: { select: { id: true, title: true } },
      },
    });

    if (!batch) {
      throw new BadRequestException('Партия не найдена');
    }

    if (batch.status !== 'ACTIVE') {
      throw new BadRequestException('Скидку можно установить только на активную партию');
    }

    // Обновляем скидку в партии
    await this.prisma.batch.update({
      where: { id: batchId },
      data: { discountPercent: dto.discountPercent },
    });

    // Пересчитываем цену товара (если эта партия — активная FIFO)
    await this.purchasesController.recalculateProductPrice(batch.productId);

    return {
      success: true,
      message: `Скидка ${dto.discountPercent}% установлена на партию товара "${batch.product.title}"`,
      discountPercent: dto.discountPercent,
    };
  }

  // Списать товар
  @Post('write-off')
  async writeOff(@Body() dto: WriteOffDto) {
    const batch = await this.prisma.batch.findUnique({
      where: { id: dto.batchId },
      include: {
        product: { select: { id: true, title: true } },
      },
    });

    if (!batch) {
      throw new BadRequestException('Партия не найдена');
    }

    if (dto.quantity > batch.remainingQty) {
      throw new BadRequestException(
        `Нельзя списать больше, чем есть в наличии (${batch.remainingQty})`,
      );
    }

    // Выполняем списание
    await this.prisma.$transaction(async (tx) => {
      // Создаём запись о списании
      await tx.writeOff.create({
        data: {
          batchId: dto.batchId,
          quantity: dto.quantity,
          reason: dto.reason || 'Просрочка',
        },
      });

      // Уменьшаем остаток в партии
      const newRemainingQty = batch.remainingQty - dto.quantity;
      await tx.batch.update({
        where: { id: dto.batchId },
        data: {
          remainingQty: newRemainingQty,
          status: newRemainingQty === 0 ? 'WRITTEN_OFF' : batch.status,
        },
      });

      // Уменьшаем общий остаток товара
      await tx.product.update({
        where: { id: batch.productId },
        data: {
          stock: { decrement: dto.quantity },
        },
      });

      // Если партия полностью списана, пересчитываем цену товара
      if (newRemainingQty === 0) {
        await this.purchasesController.recalculateProductPrice(
          batch.productId,
          tx,
        );
      }
    });

    return {
      success: true,
      message: `Списано ${dto.quantity} ед. товара "${batch.product.title}"`,
    };
  }

  // Списать всю партию полностью
  @Post('write-off-batch/:batchId')
  async writeOffBatch(
    @Param('batchId') batchId: string,
    @Body() body: { reason?: string },
  ) {
    const batch = await this.prisma.batch.findUnique({
      where: { id: batchId },
      include: {
        product: { select: { id: true, title: true } },
      },
    });

    if (!batch) {
      throw new BadRequestException('Партия не найдена');
    }

    if (batch.remainingQty === 0) {
      throw new BadRequestException('Партия уже пустая');
    }

    return this.writeOff({
      batchId,
      quantity: batch.remainingQty,
      reason: body.reason,
    });
  }

  // Получить историю списаний
  @Get('write-offs')
  async getWriteOffs(
    @Query('page') page = '1',
    @Query('limit') limit = '50',
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Req() req?: AuthRequest,
  ) {
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 50;
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }
    if (req?.darkstoreId) {
      where.batch = { purchase: { darkstoreId: req.darkstoreId } };
    }

    const [writeOffs, total] = await Promise.all([
      this.prisma.writeOff.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          batch: {
            include: {
              product: {
                select: { id: true, title: true, imageUrl: true },
              },
              purchase: {
                select: { purchaseNumber: true },
              },
            },
          },
        },
      }),
      this.prisma.writeOff.count({ where }),
    ]);

    return {
      data: writeOffs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    };
  }

  // Статистика списаний для аналитики
  @Get('stats')
  async getExpiryStats(@Query('from') from?: string, @Query('to') to?: string, @Req() req?: AuthRequest) {
    const where: any = {};
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }
    if (req?.darkstoreId) {
      where.batch = { purchase: { darkstoreId: req.darkstoreId } };
    }

    // Общее количество списанных единиц
    const writeOffs = await this.prisma.writeOff.findMany({
      where,
      include: {
        batch: {
          select: { purchasePrice: true, productId: true },
        },
      },
    });

    const totalQuantity = writeOffs.reduce((sum, w) => sum + w.quantity, 0);
    const totalValue = writeOffs.reduce(
      (sum, w) => sum + w.quantity * w.batch.purchasePrice,
      0,
    );

    // Группировка по товарам
    const byProduct: Record<string, { quantity: number; value: number }> = {};
    for (const wo of writeOffs) {
      const pid = wo.batch.productId;
      if (!byProduct[pid]) {
        byProduct[pid] = { quantity: 0, value: 0 };
      }
      byProduct[pid].quantity += wo.quantity;
      byProduct[pid].value += wo.quantity * wo.batch.purchasePrice;
    }

    // Получаем названия товаров
    const productIds = Object.keys(byProduct);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, title: true },
    });

    const productMap = new Map(products.map((p) => [p.id, p.title]));

    const byProductList = Object.entries(byProduct)
      .map(([productId, data]) => ({
        productId,
        productTitle: productMap.get(productId) || 'Неизвестный товар',
        quantity: data.quantity,
        value: data.value,
      }))
      .sort((a, b) => b.value - a.value);

    // Партии, истекающие в ближайшие 7 дней
    const today = new Date();
    const weekLater = new Date();
    weekLater.setDate(today.getDate() + 7);

    const dsFilter = this.getDarkstoreFilter(req);

    const expiringCount = await this.prisma.batch.count({
      where: {
        status: 'ACTIVE',
        remainingQty: { gt: 0 },
        expiryDate: {
          not: null,
          lte: weekLater,
          gte: today,
        },
        ...dsFilter,
      },
    });

    // Просроченные партии
    const expiredCount = await this.prisma.batch.count({
      where: {
        remainingQty: { gt: 0 },
        expiryDate: {
          not: null,
          lt: today,
        },
        ...dsFilter,
      },
    });

    return {
      totalWriteOffs: writeOffs.length,
      totalQuantity,
      totalValue,
      byProduct: byProductList,
      expiringBatches: expiringCount,
      expiredBatches: expiredCount,
    };
  }
}
