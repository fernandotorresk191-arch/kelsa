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
  addressLine: string
}

class LoginDto {
  @IsString()
  login: string

  @IsString()
  password: string
}

// 3) Guard (без passport, просто проверяем JWT)
class JwtGuard {
  constructor(private readonly jwt: JwtService) {}

  canActivate(context: any) {
    const req = context.switchToHttp().getRequest()
    const auth = req.headers?.authorization as string | undefined
    const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null
    if (!token) throw new UnauthorizedException('No token')

    try {
      const payload = this.jwt.verify(token)
      req.user = payload
      return true
    } catch {
      throw new UnauthorizedException('Invalid token')
    }
  }
}

@Controller('v1')
export class AuthController {
  private readonly guard: JwtGuard

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {
    this.guard = new JwtGuard(this.jwt)
  }

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
        phone: dto.phone,
        addressLine: dto.addressLine,
        passwordHash,
        settlement: dto.settlement as any, // enum Prisma
      },
      select: { id: true, login: true, settlement: true, createdAt: true },
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
        settlement: user.settlement,
        settlementTitle: SETTLEMENT_LABELS[user.settlement as unknown as Settlement],
      },
      accessToken,
    }
  }

  // Профиль
  @UseGuards(function (this: AuthController) { return this.guard } as any)
  @Get('me')
  async me(@Req() req: any) {
    const userId = req.user?.sub as string
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, login: true, settlement: true, createdAt: true },
    })
    if (!user) throw new UnauthorizedException('User not found')

    return {
      ...user,
      settlementTitle: SETTLEMENT_LABELS[user.settlement as unknown as Settlement],
    }
  }

  // Мои заказы + статусы (для личного кабинета)
  @UseGuards(function (this: AuthController) { return this.guard } as any)
  @Get('me/orders')
  async myOrders(@Req() req: any) {
    const userId = req.user?.sub as string

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
