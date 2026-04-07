/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { Body, Controller, Delete, Get, NotFoundException, Param, Patch, Post, Req, UnauthorizedException, BadRequestException, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import * as nodemailer from 'nodemailer';
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

class CheckPhoneDto {
  @IsString()
  phone: string
}

class LoginByPhoneDto {
  @IsString()
  phone: string

  @IsString()
  password: string

  @IsOptional()
  @IsEmail()
  email?: string
}

class RegisterByPhoneDto {
  @IsString()
  phone: string

  @IsString()
  @MinLength(6)
  password: string

  @IsString()
  name: string

  @IsString()
  addressLine: string

  @IsString()
  settlement: string

  @IsOptional()
  @IsEmail()
  email?: string
}

class RequestPasswordResetDto {
  @IsString()
  phone: string
}

class ConfirmPasswordResetDto {
  @IsString()
  token: string

  @IsString()
  @MinLength(6)
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
    private readonly config: ConfigService,
  ) {}

  private getMailTransport() {
    const port = Number(this.config.get<string>('SMTP_PORT') ?? '465');
    return nodemailer.createTransport({
      host: this.config.get<string>('SMTP_HOST') ?? '31.31.197.72',
      port,
      secure: port === 465,
      auth: {
        user: this.config.get<string>('SMTP_USER') ?? 'noreply@kelsa.store',
        pass: this.config.get<string>('SMTP_PASS') ?? '',
      },
      tls: { rejectUnauthorized: false },
    });
  }

  // Справочник сёл для фронта — берётся из активных зон доставки
  @Get('settlements')
  async settlements() {
    const zones = await this.prisma.deliveryZone.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' },
      select: { settlement: true, settlementTitle: true, darkstoreId: true },
    });
    return zones.map((z) => ({
      code: z.settlement,
      title: z.settlementTitle || z.settlement,
      darkstoreId: z.darkstoreId,
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

  // Проверка существования пользователя по телефону
  @Post('auth/check-phone')
  async checkPhone(@Body() dto: CheckPhoneDto) {
    const user = await this.prisma.user.findFirst({
      where: { phone: dto.phone },
      select: { id: true },
    })
    return { exists: !!user }
  }

  // Логин по телефону + пароль
  @Post('auth/login-by-phone')
  async loginByPhone(@Body() dto: LoginByPhoneDto) {
    const user = await this.prisma.user.findFirst({ where: { phone: dto.phone } });
    if (!user) throw new UnauthorizedException('Пользователь не найден');

    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Неверный пароль');

    // Update email if provided and current is placeholder
    if (dto.email && user.email.endsWith('@kelsa.local')) {
      const emailTaken = await this.prisma.user.findUnique({ where: { email: dto.email } });
      if (!emailTaken) {
        await this.prisma.user.update({ where: { id: user.id }, data: { email: dto.email } });
      }
    }

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

  // Регистрация по телефону (из корзины)
  @Post('auth/register-by-phone')
  async registerByPhone(@Body() dto: RegisterByPhoneDto) {
    const existing = await this.prisma.user.findFirst({
      where: { phone: dto.phone },
    })
    if (existing) {
      throw new UnauthorizedException('Пользователь с таким телефоном уже существует')
    }

    const passwordHash = await bcrypt.hash(dto.password, 10)

    // Автогенерация логина; email из формы или автогенерация
    const phoneDigits = dto.phone.replace(/\D/g, '')
    const login = `user_${phoneDigits}`
    let email = dto.email || `${phoneDigits}@kelsa.local`

    // Check email uniqueness; fall back to autogenerated if taken
    if (dto.email) {
      const emailTaken = await this.prisma.user.findUnique({ where: { email: dto.email } });
      if (emailTaken) email = `${phoneDigits}@kelsa.local`;
    }

    const user = await this.prisma.user.create({
      data: {
        login,
        email,
        name: dto.name,
        phone: dto.phone,
        addressLine: dto.addressLine,
        passwordHash,
        settlement: dto.settlement as any,
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

  // Запрос сброса пароля — отправляет ссылку на email
  @Post('auth/request-password-reset')
  async requestPasswordReset(@Body() dto: RequestPasswordResetDto) {
    const user = await this.prisma.user.findFirst({ where: { phone: dto.phone } });
    if (!user) throw new BadRequestException('Пользователь с таким телефоном не найден');

    if (!user.email || user.email.endsWith('@kelsa.local')) {
      throw new BadRequestException('К вашему аккаунту не привязан email. Обратитесь в поддержку.');
    }

    // Delete old reset tokens for this user
    await this.prisma.passwordReset.deleteMany({ where: { userId: user.id } });

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.prisma.passwordReset.create({
      data: { token, userId: user.id, expiresAt },
    });

    const frontendUrl = this.config.get<string>('FRONTEND_URL') ?? 'https://kelsa.store';
    const resetLink = `${frontendUrl}/reset-password?token=${token}`;
    const fromEmail = this.config.get<string>('SMTP_FROM') ?? 'noreply@kelsa.store';

    const transporter = this.getMailTransport();
    await transporter.sendMail({
      from: `"Kelsa" <${fromEmail}>`,
      to: user.email,
      subject: 'Сброс пароля — Kelsa',
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #333;">Сброс пароля</h2>
          <p>Здравствуйте, ${user.name}!</p>
          <p>Вы запросили сброс пароля. Нажмите на кнопку ниже, чтобы установить новый пароль:</p>
          <a href="${resetLink}" style="display: inline-block; padding: 12px 24px; background-color: #6206c7; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">
            Сбросить пароль
          </a>
          <p style="margin-top: 16px; color: #666; font-size: 14px;">Ссылка действительна 1 час.</p>
          <p style="color: #999; font-size: 12px;">Если вы не запрашивали сброс пароля, просто проигнорируйте это письмо.</p>
        </div>
      `,
    });

    // Mask email for the response
    const [localPart, domain] = user.email.split('@');
    const masked = localPart.slice(0, 2) + '***@' + domain;

    return { message: 'Ссылка для сброса пароля отправлена', email: masked };
  }

  // Подтверждение сброса пароля
  @Post('auth/confirm-password-reset')
  async confirmPasswordReset(@Body() dto: ConfirmPasswordResetDto) {
    const reset = await this.prisma.passwordReset.findUnique({
      where: { token: dto.token },
      include: { user: true },
    });

    if (!reset) throw new BadRequestException('Недействительная ссылка сброса пароля');
    if (reset.usedAt) throw new BadRequestException('Эта ссылка уже была использована');
    if (reset.expiresAt < new Date()) throw new BadRequestException('Срок действия ссылки истёк');

    const passwordHash = await bcrypt.hash(dto.password, 10);

    await this.prisma.user.update({
      where: { id: reset.userId },
      data: { passwordHash },
    });

    await this.prisma.passwordReset.update({
      where: { id: reset.id },
      data: { usedAt: new Date() },
    });

    // Auto-login
    const accessToken = this.jwt.sign({ sub: reset.userId });

    return {
      user: {
        id: reset.user.id,
        login: reset.user.login,
        name: reset.user.name,
        phone: reset.user.phone,
        addressLine: reset.user.addressLine,
        settlement: reset.user.settlement,
        settlementTitle: await this.getSettlementTitle(reset.user.settlement),
      },
      accessToken,
    };
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
        addressLine: true,
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
