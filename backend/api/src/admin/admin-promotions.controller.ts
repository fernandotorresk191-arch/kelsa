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
import { JwtGuard } from '../auth/jwt.guard';

interface AuthRequest {
  user: { role?: string };
}

@Controller('v1/admin/promotions')
@UseGuards(JwtGuard)
export class AdminPromotionsController {
  constructor(private prisma: PrismaService) {}

  private checkAdminRole(req: AuthRequest) {
    if (req.user?.role !== 'admin' && req.user?.role !== 'manager') {
      throw new UnauthorizedException('Admin access required');
    }
  }

  @Get()
  async getPromotions(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Req() req?: AuthRequest,
  ) {
    this.checkAdminRole(req!);
    const pageNum = Math.max(Number(page ?? 1), 1);
    const limitNum = Math.min(Number(limit ?? 20), 100);
    const skip = (pageNum - 1) * limitNum;

    const [data, total] = await Promise.all([
      this.prisma.promotion.findMany({
        orderBy: [{ sort: 'asc' }, { createdAt: 'desc' }],
        skip,
        take: limitNum,
      }),
      this.prisma.promotion.count(),
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
    this.checkAdminRole(req!);
    
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
    this.checkAdminRole(req!);
    
    return this.prisma.promotion.create({
      data: {
        title: body.title,
        imageUrl: body.imageUrl,
        url: body.url || null,
        sort: body.sort ?? 0,
        isActive: body.isActive ?? true,
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
    this.checkAdminRole(req!);
    
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
    this.checkAdminRole(req!);
    
    await this.prisma.promotion.delete({
      where: { id },
    });
    return { success: true };
  }
}
