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
import { JwtGuard } from '../auth/jwt.guard';
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
}

@Controller('v1/admin/delivery-zones')
@UseGuards(JwtGuard)
export class AdminDeliveryZonesController {
  constructor(private prisma: PrismaService) {}

  private checkAdminRole(req: AuthRequest) {
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      throw new UnauthorizedException('Admin access required');
    }
  }

  @Get()
  async getDeliveryZones(@Req() req: AuthRequest) {
    this.checkAdminRole(req);

    const zones = await this.prisma.deliveryZone.findMany({
      orderBy: { createdAt: 'asc' },
    });

    return {
      data: zones,
    };
  }

  @Post()
  async createDeliveryZone(@Body() dto: CreateDeliveryZoneDto, @Req() req: AuthRequest) {
    this.checkAdminRole(req);

    // Проверка: не существует ли уже зона для этого н.п.
    const existing = await this.prisma.deliveryZone.findUnique({
      where: { settlement: dto.settlement },
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
    this.checkAdminRole(req);

    const existing = await this.prisma.deliveryZone.findUnique({ where: { id } });
    if (!existing) {
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
    this.checkAdminRole(req);

    const existing = await this.prisma.deliveryZone.findUnique({ where: { id } });
    if (!existing) {
      throw new BadRequestException('Зона доставки не найдена');
    }

    await this.prisma.deliveryZone.delete({ where: { id } });
    return { success: true };
  }
}
