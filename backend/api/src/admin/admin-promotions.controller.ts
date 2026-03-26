/* eslint-disable prettier/prettier */
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  BadRequestException,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { AdminGuard } from './admin.guard';

interface AuthRequest {
  user: { role?: string };
  darkstoreId: string | null;
}

@Controller('v1/admin/promotions')
@UseGuards(AdminGuard)
export class AdminPromotionsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async getPromotions(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Req() req?: AuthRequest,
  ) {
    const pageNum = Math.max(Number(page ?? 1), 1);
    const limitNum = Math.min(Number(limit ?? 20), 100);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (req?.darkstoreId) where.darkstoreId = req.darkstoreId;

    const [data, total] = await Promise.all([
      this.prisma.promotion.findMany({
        where,
        orderBy: [{ sort: 'asc' }, { createdAt: 'desc' }],
        skip,
        take: limitNum,
      }),
      this.prisma.promotion.count({ where }),
    ]);

    return {
      data,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  @Get(':id')
  async getPromotion(@Param('id') id: string, @Req() req?: AuthRequest) {
    const promotion = await this.prisma.promotion.findUnique({
      where: { id },
    });

    if (!promotion) {
      throw new BadRequestException('Промо не найдено');
    }

    return promotion;
  }

  @Post()
  async createPromotion(
    @Body()
    body: {
      title: string;
      imageUrl: string;
      url?: string;
      sort?: number;
      isActive?: boolean;
    },
    @Req() req?: AuthRequest,
  ) {
    if (!req?.darkstoreId) {
      throw new BadRequestException('Darkstore not selected');
    }

    return this.prisma.promotion.create({
      data: {
        title: body.title,
        imageUrl: body.imageUrl,
        url: body.url || null,
        sort: body.sort ?? 0,
        isActive: body.isActive ?? true,
        darkstoreId: req.darkstoreId,
      },
    });
  }

  @Put(':id')
  async updatePromotion(
    @Param('id') id: string,
    @Body()
    body: {
      title?: string;
      imageUrl?: string;
      url?: string;
      sort?: number;
      isActive?: boolean;
    },
    @Req() req?: AuthRequest,
  ) {
    return this.prisma.promotion.update({
      where: { id },
      data: {
        ...(body.title !== undefined && { title: body.title }),
        ...(body.imageUrl !== undefined && { imageUrl: body.imageUrl }),
        ...(body.url !== undefined && { url: body.url || null }),
        ...(body.sort !== undefined && { sort: body.sort }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
      },
    });
  }

  @Delete(':id')
  async deletePromotion(@Param('id') id: string, @Req() req?: AuthRequest) {
    await this.prisma.promotion.delete({
      where: { id },
    });
    return { success: true };
  }
}
