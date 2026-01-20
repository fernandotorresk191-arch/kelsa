/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { Body, Controller, Get, Post, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { IsEmail, IsEnum, IsString, MinLength } from 'class-validator';
import { PrismaService } from 'prisma/prisma.service';
import { JwtGuard } from './jwt.guard';


// 1) Список сёл (жёстко задан)
export enum Settlement {
  KALINOVSKAYA = 'KALINOVSKAYA',
  NOVOTERSKAYA = 'NOVOTERSKAYA',
  LEVOBEREZHNOE = 'LEVOBEREZHNOE',
  YUBILEYNOE = 'YUBILEYNOE',
  NOVOE_SOLKUSHINO = 'NOVOE_SOLKUSHINO',
}

const SETTLEMENT_LABELS: Record<Settlement, string> = {
  [Settlement.KALINOVSKAYA]: 'Калиновская',
  [Settlement.NOVOTERSKAYA]: 'Новотерская',
  [Settlement.LEVOBEREZHNOE]: 'Левобережное',
  [Settlement.YUBILEYNOE]: 'Юбилейное',
  [Settlement.NOVOE_SOLKUSHINO]: 'Новое-Солкушино',
}

// 2) DTO
class RegisterDto {
  @IsString()
  @MinLength(3)
  login: string

  @IsString()
  @MinLength(6)
  password: string

  @IsEnum(Settlement)
  settlement: Settlement

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

// 3) Guard is now in jwt.guard.ts file


@Controller('v1')
export class AuthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly guard: JwtGuard,
  ) {}

  // Справочник сёл для фронта
  @Get('settlements')
  settlements() {
    return Object.values(Settlement).map((code) => ({
      code,
      title: SETTLEMENT_LABELS[code as Settlement],
    }))
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
      select: { id: true, login: true, name: true, settlement: true, createdAt: true },
    })

    const accessToken = this.jwt.sign({ sub: user.id })

    return {
      user: {
        ...user,
        settlementTitle: SETTLEMENT_LABELS[user.settlement as unknown as Settlement],
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
        settlement: user.settlement,
        settlementTitle: SETTLEMENT_LABELS[user.settlement as unknown as Settlement],
      },
      accessToken,
    }
  }

  @UseGuards(JwtGuard)
  @Get('me')
  async me(@Req() req: any) {
    console.log('=== /me Endpoint Debug ===')
    console.log('req.user:', JSON.stringify(req.user, null, 2))
    console.log('req.user?.sub:', req.user?.sub)
    const userId = req.user?.sub as string
    if (!userId) throw new UnauthorizedException('Invalid token payload')
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, login: true, name: true, settlement: true, createdAt: true },
    })
    if (!user) throw new UnauthorizedException('User not found')

    return {
      ...user,
      settlementTitle: SETTLEMENT_LABELS[user.settlement as unknown as Settlement],
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
        createdAt: true,
        updatedAt: true,
        items: { select: { title: true, qty: true, price: true, amount: true } },
      },
    })
  }
}
