/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import {
  Body,
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  UseGuards,
  Req,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { AdminGuard } from './admin.guard';
import { IsString, IsOptional, IsBoolean, IsNumber } from 'class-validator';

class CreateDeliveryZoneDto {
  @IsString()
  settlement: string;

  @IsString()
  settlementTitle: string;

  @IsNumber()
  deliveryFee: number;

  @IsNumber()
  freeDeliveryFrom: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

class UpdateDeliveryZoneDto {
  @IsOptional()
  @IsNumber()
  deliveryFee?: number;

  @IsOptional()
  @IsNumber()
  freeDeliveryFrom?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

interface AuthRequest {
  user: { role: string };
  darkstoreId: string | null;
}

@Controller('v1/admin/delivery-zones')
@UseGuards(AdminGuard)
export class AdminDeliveryZonesController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async getDeliveryZones(@Req() req: AuthRequest) {
    const where: any = {};
    if (req.darkstoreId) where.darkstoreId = req.darkstoreId;

    const zones = await this.prisma.deliveryZone.findMany({
      where,
      orderBy: { createdAt: 'asc' },
    });

    return {
      data: zones,
    };
  }

  @Post()
  async createDeliveryZone(@Body() dto: CreateDeliveryZoneDto, @Req() req: AuthRequest) {
    if (!req.darkstoreId) {
      throw new BadRequestException('Darkstore not selected');
    }

    // Проверка: не существует ли уже зона для этого н.п. в этом дарксторе
    const existing = await this.prisma.deliveryZone.findFirst({
      where: { settlement: dto.settlement, darkstoreId: req.darkstoreId },
    });

    if (existing) {
      throw new BadRequestException('Зона доставки для этого населённого пункта уже существует');
    }

    const zone = await this.prisma.deliveryZone.create({
      data: {
        settlement: dto.settlement,
        settlementTitle: dto.settlementTitle,
        deliveryFee: dto.deliveryFee,
        freeDeliveryFrom: dto.freeDeliveryFrom,
        isActive: dto.isActive ?? true,
        darkstoreId: req.darkstoreId!,
      },
    });

    return zone;
  }

  @Put(':id')
  async updateDeliveryZone(
    @Param('id') id: string,
    @Body() dto: UpdateDeliveryZoneDto,
    @Req() req: AuthRequest,
  ) {
    const existing = await this.prisma.deliveryZone.findUnique({ where: { id } });
    if (!existing) {
      throw new BadRequestException('Зона доставки не найдена');
    }
    if (req.darkstoreId && existing.darkstoreId !== req.darkstoreId) {
      throw new BadRequestException('Зона доставки не найдена');
    }

    const zone = await this.prisma.deliveryZone.update({
      where: { id },
      data: {
        ...(dto.deliveryFee !== undefined && { deliveryFee: dto.deliveryFee }),
        ...(dto.freeDeliveryFrom !== undefined && { freeDeliveryFrom: dto.freeDeliveryFrom }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });

    return zone;
  }

  @Delete(':id')
  async deleteDeliveryZone(@Param('id') id: string, @Req() req: AuthRequest) {
    const existing = await this.prisma.deliveryZone.findUnique({ where: { id } });
    if (!existing) {
      throw new BadRequestException('Зона доставки не найдена');
    }
    if (req.darkstoreId && existing.darkstoreId !== req.darkstoreId) {
      throw new BadRequestException('Зона доставки не найдена');
    }

    await this.prisma.deliveryZone.delete({ where: { id } });
    return { success: true };
  }
}
