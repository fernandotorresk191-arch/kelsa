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
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { AdminGuard } from './admin.guard';
import { Roles } from './roles.decorator';
import { IsString, IsOptional, IsBoolean } from 'class-validator';

class CreateDarkstoreDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  shortName?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

class UpdateDarkstoreDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  shortName?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

@Controller('v1/admin/darkstores')
@UseGuards(AdminGuard)
export class AdminDarkstoresController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async getDarkstores(@Req() req: any) {
    // Superadmin sees all; admin/manager see assigned
    if (req.user.role === 'superadmin') {
      return this.prisma.darkstore.findMany({
        orderBy: { createdAt: 'asc' },
        include: {
          _count: {
            select: {
              darkstoreProducts: true,
              orders: true,
              couriers: true,
              deliveryZones: true,
              staff: true,
            },
          },
        },
      });
    }

    const assignments = await this.prisma.adminUserDarkstore.findMany({
      where: { adminUserId: req.user.sub },
      select: { darkstoreId: true },
    });

    return this.prisma.darkstore.findMany({
      where: { id: { in: assignments.map((a) => a.darkstoreId) } },
      orderBy: { createdAt: 'asc' },
      include: {
        _count: {
          select: {
            darkstoreProducts: true,
            orders: true,
            couriers: true,
            deliveryZones: true,
            staff: true,
          },
        },
      },
    });
  }

  @Get(':id')
  async getDarkstore(@Param('id') id: string) {
    const darkstore = await this.prisma.darkstore.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            darkstoreProducts: true,
            orders: true,
            darkstoreCategories: true,
            couriers: true,
            deliveryZones: true,
            staff: true,
            purchases: true,
            promotions: true,
          },
        },
      },
    });

    if (!darkstore) {
      throw new BadRequestException('Даркстор не найден');
    }

    return darkstore;
  }

  @Post()
  @Roles('superadmin')
  async createDarkstore(@Body() dto: CreateDarkstoreDto) {
    const darkstore = await this.prisma.darkstore.create({
      data: {
        name: dto.name,
        shortName: dto.shortName || null,
        address: dto.address || null,
        isActive: dto.isActive ?? true,
      },
    });

    // Автоматически привязываем все глобальные категории к новому даркстору
    const categories = await this.prisma.category.findMany({ select: { id: true } });
    if (categories.length > 0) {
      await this.prisma.darkstoreCategory.createMany({
        data: categories.map((cat) => ({
          categoryId: cat.id,
          darkstoreId: darkstore.id,
          isActive: true,
        })),
        skipDuplicates: true,
      });
    }

    return darkstore;
  }

  @Put(':id')
  @Roles('superadmin')
  async updateDarkstore(@Param('id') id: string, @Body() dto: UpdateDarkstoreDto) {
    const existing = await this.prisma.darkstore.findUnique({ where: { id } });
    if (!existing) {
      throw new BadRequestException('Даркстор не найден');
    }

    return this.prisma.darkstore.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.shortName !== undefined && { shortName: dto.shortName || null }),
        ...(dto.address !== undefined && { address: dto.address }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  @Delete(':id')
  @Roles('superadmin')
  async deleteDarkstore(@Param('id') id: string) {
    const existing = await this.prisma.darkstore.findUnique({ where: { id } });
    if (!existing) {
      throw new BadRequestException('Даркстор не найден');
    }

    // Check for data linked to this darkstore
    const orders = await this.prisma.order.count({ where: { darkstoreId: id } });
    if (orders > 0) {
      throw new BadRequestException('Нельзя удалить даркстор с заказами. Деактивируйте его.');
    }

    await this.prisma.darkstore.delete({ where: { id } });
    return { success: true };
  }
}
