/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { Body, Controller, Delete, Get, NotFoundException, Param, Patch, Post, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';
import { PrismaService } from 'prisma/prisma.service';
import { JwtGuard } from './jwt.guard';


// 2) DTO
class RegisterDto {
  @IsString()
  @MinLength(3)
  login: string

  @IsString()
  @MinLength(6)
  password: string

  @IsString()
  settlement: string

  @IsEmail()
  email: string

  @IsString()
  phone: string

  @IsString()
  name: string

  @IsString()
  addressLine: string
}

class LoginDto {
  @IsString()
  login: string

  @IsString()
  password: string
}

class FavoriteDto {
  @IsString()
  productId: string
}

class UpdateProfileDto {
  @IsOptional()
  @IsString()
  name?: string

  @IsOptional()
  @IsString()
  phone?: string

  @IsOptional()
  @IsString()
  addressLine?: string

  @IsOptional()
  @IsString()
  settlement?: string
}

// 3) Guard is now in jwt.guard.ts file


@Controller('v1')
export class AuthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly guard: JwtGuard,
  ) {}

  // Справочник сёл для фронта — берётся из активных зон доставки
  @Get('settlements')
  async settlements() {
    const zones = await this.prisma.deliveryZone.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' },
      select: { settlement: true, settlementTitle: true },
    });
    return zones.map((z) => ({
      code: z.settlement,
      title: z.settlementTitle || z.settlement,
    }));
  }

  // Получить название н.п. из зоны доставки
  private async getSettlementTitle(code: string): Promise<string> {
    if (!code) return '';
    const zone = await this.prisma.deliveryZone.findUnique({
      where: { settlement: code },
      select: { settlementTitle: true },
    });
    return zone?.settlementTitle || code;
  }

  // Регистрация
  @Post('auth/register')
  async register(@Body() dto: RegisterDto) {
    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [{ login: dto.login }, { email: dto.email }],
      },
    })

    if (existing) {
      const field = existing.login === dto.login ? 'Login' : 'Email'
      throw new UnauthorizedException(`${field} already exists`)
    }

    const passwordHash = await bcrypt.hash(dto.password, 10)

    const user = await this.prisma.user.create({
      data: {
        login: dto.login,
        email: dto.email,
        name: dto.name,
        phone: dto.phone,
        addressLine: dto.addressLine,
        passwordHash,
        settlement: dto.settlement as any, // enum Prisma
      },
      select: {
        id: true,
        login: true,
        name: true,
        phone: true,
        addressLine: true,
        settlement: true,
        createdAt: true,
      },
    })

    const accessToken = this.jwt.sign({ sub: user.id })

    return {
      user: {
        ...user,
        settlementTitle: await this.getSettlementTitle(user.settlement),
      },
      accessToken,
    }
  }

  // Логин
  @Post('auth/login')
  async login(@Body() dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { login: dto.login } });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    const accessToken = this.jwt.sign({ sub: user.id });

    return {
      user: {
        id: user.id,
        login: user.login,
        name: user.name,
        phone: user.phone,
        addressLine: user.addressLine,
        settlement: user.settlement,
        settlementTitle: await this.getSettlementTitle(user.settlement),
      },
      accessToken,
    }
  }

  @UseGuards(JwtGuard)
  @Get('me')
  async me(@Req() req: any) {
    const userId = req.user?.sub as string
    if (!userId) throw new UnauthorizedException('Invalid token payload')
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        login: true,
        name: true,
        phone: true,
        addressLine: true,
        settlement: true,
        createdAt: true,
      },
    })
    if (!user) throw new UnauthorizedException('User not found')

    return {
      ...user,
      settlementTitle: await this.getSettlementTitle(user.settlement),
    }
  }

  @UseGuards(JwtGuard)
  @Patch('me/profile')
  async updateProfile(@Req() req: any, @Body() dto: UpdateProfileDto) {
    const userId = req.user?.sub as string
    if (!userId) throw new UnauthorizedException('Invalid token payload')

    const data: Record<string, any> = {}
    if (dto.name !== undefined) data.name = dto.name
    if (dto.phone !== undefined) data.phone = dto.phone
    if (dto.addressLine !== undefined) data.addressLine = dto.addressLine
    if (dto.settlement !== undefined) data.settlement = dto.settlement

    const user = await this.prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        login: true,
        name: true,
        phone: true,
        addressLine: true,
        settlement: true,
        createdAt: true,
      },
    })

    return {
      ...user,
      settlementTitle: await this.getSettlementTitle(user.settlement),
    }
  }

  // Мои заказы + статусы (для личного кабинета)
  @UseGuards(JwtGuard)
  @Get('me/orders')
  async myOrders(@Req() req: any) {
    const userId = req.user?.sub as string
    if (!userId) throw new UnauthorizedException('Invalid token payload')

    return this.prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        orderNumber: true,
        status: true,
        totalAmount: true,
        deliveryFee: true,
        createdAt: true,
        updatedAt: true,
        items: { select: { title: true, qty: true, price: true, amount: true } },
      },
    })
  }

  @UseGuards(JwtGuard)
  @Get('me/favorites')
  async myFavorites(@Req() req: any) {
    const userId = req.user?.sub as string
    if (!userId) throw new UnauthorizedException('Invalid token payload')

    const favorites = await this.prisma.favorite.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        product: {
          include: {
            category: { select: { id: true, name: true, slug: true } },
          },
        },
      },
    })

    return favorites.map((favorite) => favorite.product)
  }

  @UseGuards(JwtGuard)
  @Post('me/favorites')
  async addFavorite(@Req() req: any, @Body() dto: FavoriteDto) {
    const userId = req.user?.sub as string
    if (!userId) throw new UnauthorizedException('Invalid token payload')

    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
      include: {
        category: { select: { id: true, name: true, slug: true } },
      },
    })

    if (!product || !product.isActive) {
      throw new NotFoundException('Product not found')
    }

    await this.prisma.favorite.upsert({
      where: { userId_productId: { userId, productId: dto.productId } },
      update: {},
      create: { userId, productId: dto.productId },
    })

    return product
  }

  @UseGuards(JwtGuard)
  @Delete('me/favorites/:productId')
  async removeFavorite(@Req() req: any, @Param('productId') productId: string) {
    const userId = req.user?.sub as string
    if (!userId) throw new UnauthorizedException('Invalid token payload')

    await this.prisma.favorite.deleteMany({
      where: { userId, productId },
    })

    return { ok: true }
  }
}
