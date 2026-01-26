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
  Query,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { JwtGuard } from '../auth/jwt.guard';
import { IsString, IsOptional, IsBoolean, MinLength } from 'class-validator';
import * as bcrypt from 'bcrypt';

class CreateCourierDto {
  @IsString()
  @MinLength(2)
  fullName: string;

  @IsString()
  @MinLength(3)
  login: string;

  @IsString()
  @MinLength(4)
  password: string;

  @IsString()
  phone: string;

  @IsOptional()
  @IsString()
  carBrand?: string;

  @IsOptional()
  @IsString()
  carNumber?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

class UpdateCourierDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  fullName?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  login?: string;

  @IsOptional()
  @IsString()
  @MinLength(4)
  password?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  carBrand?: string;

  @IsOptional()
  @IsString()
  carNumber?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

interface AuthRequest {
  user: { role: string };
}

@Controller('v1/admin/couriers')
@UseGuards(JwtGuard)
export class AdminCouriersController {
  constructor(private prisma: PrismaService) {}

  private checkAdminRole(req: AuthRequest) {
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      throw new UnauthorizedException('Admin access required');
    }
  }

  @Get()
  async getCouriers(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Query('search') search?: string,
    @Req() req?: AuthRequest,
  ) {
    this.checkAdminRole(req as AuthRequest);

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where: {
      OR?: {
        fullName?: { contains: string; mode: 'insensitive' };
        login?: { contains: string; mode: 'insensitive' };
      }[];
    } = {};

    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { login: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [couriers, total] = await Promise.all([
      this.prisma.courier.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          fullName: true,
          login: true,
          phone: true,
          carBrand: true,
          carNumber: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.courier.count({ where }),
    ]);

    return {
      data: couriers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    };
  }

  @Get(':id')
  async getCourier(@Param('id') id: string, @Req() req: AuthRequest) {
    this.checkAdminRole(req);

    const courier = await this.prisma.courier.findUnique({
      where: { id },
      select: {
        id: true,
        fullName: true,
        login: true,
        phone: true,
        carBrand: true,
        carNumber: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!courier) {
      throw new BadRequestException('Курьер не найден');
    }

    return courier;
  }

  @Post()
  async createCourier(@Body() dto: CreateCourierDto, @Req() req: AuthRequest) {
    this.checkAdminRole(req);

    // Проверяем уникальность логина
    const existingCourier = await this.prisma.courier.findUnique({
      where: { login: dto.login },
    });

    if (existingCourier) {
      throw new ConflictException('Курьер с таким логином уже существует');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const courier = await this.prisma.courier.create({
      data: {
        fullName: dto.fullName,
        login: dto.login,
        passwordHash,
        phone: dto.phone,
        carBrand: dto.carBrand || null,
        carNumber: dto.carNumber || null,
        isActive: dto.isActive ?? true,
      },
      select: {
        id: true,
        fullName: true,
        login: true,
        phone: true,
        carBrand: true,
        carNumber: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return courier;
  }

  @Put(':id')
  async updateCourier(
    @Param('id') id: string,
    @Body() dto: UpdateCourierDto,
    @Req() req: AuthRequest,
  ) {
    this.checkAdminRole(req);

    const existingCourier = await this.prisma.courier.findUnique({
      where: { id },
    });

    if (!existingCourier) {
      throw new BadRequestException('Курьер не найден');
    }

    // Проверяем уникальность логина если он меняется
    if (dto.login && dto.login !== existingCourier.login) {
      const courierWithSameLogin = await this.prisma.courier.findUnique({
        where: { login: dto.login },
      });

      if (courierWithSameLogin) {
        throw new ConflictException('Курьер с таким логином уже существует');
      }
    }

    const updateData: {
      fullName?: string;
      login?: string;
      passwordHash?: string;
      phone?: string;
      carBrand?: string | null;
      carNumber?: string | null;
      isActive?: boolean;
    } = {};

    if (dto.fullName !== undefined) updateData.fullName = dto.fullName;
    if (dto.login !== undefined) updateData.login = dto.login;
    if (dto.password !== undefined) {
      updateData.passwordHash = await bcrypt.hash(dto.password, 10);
    }
    if (dto.phone !== undefined) updateData.phone = dto.phone;
    if (dto.carBrand !== undefined) updateData.carBrand = dto.carBrand || null;
    if (dto.carNumber !== undefined) {
      updateData.carNumber = dto.carNumber || null;
    }
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

    const courier = await this.prisma.courier.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        fullName: true,
        login: true,
        phone: true,
        carBrand: true,
        carNumber: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return courier;
  }

  @Delete(':id')
  async deleteCourier(@Param('id') id: string, @Req() req: AuthRequest) {
    this.checkAdminRole(req);

    const existingCourier = await this.prisma.courier.findUnique({
      where: { id },
    });

    if (!existingCourier) {
      throw new BadRequestException('Курьер не найден');
    }

    await this.prisma.courier.delete({
      where: { id },
    });

    return { success: true };
  }

  @Get('check-login/:login')
  async checkLogin(
    @Param('login') login: string,
    @Query('excludeId') excludeId?: string,
    @Req() req?: AuthRequest,
  ) {
    this.checkAdminRole(req as AuthRequest);

    const courier = await this.prisma.courier.findUnique({
      where: { login },
      select: { id: true },
    });

    const available = !courier || courier.id === excludeId;

    return {
      available,
      existingId: courier?.id || null,
    };
  }
}
