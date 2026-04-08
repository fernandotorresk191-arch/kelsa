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
import { IsOptional, IsString } from 'class-validator';
import { PrismaService } from 'prisma/prisma.service';
import { JwtGuard } from './jwt.guard';
import { SmsService } from './sms.service';


// DTO
class SendSmsCodeDto {
  @IsString()
  phone: string
}

class VerifySmsCodeDto {
  @IsString()
  phone: string

  @IsString()
  code: string

  // Для новых пользователей — данные профиля
  @IsOptional()
  @IsString()
  name?: string

  @IsOptional()
  @IsString()
  addressLine?: string

  @IsOptional()
  @IsString()
  settlement?: string
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


@Controller('v1')
export class AuthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly guard: JwtGuard,
    private readonly config: ConfigService,
    private readonly sms: SmsService,
  ) {}

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

  private async buildUserResponse(user: { id: string; login: string; name: string; phone: string; addressLine: string; settlement: string; createdAt?: Date }) {
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
        createdAt: user.createdAt,
      },
      accessToken,
    };
  }

  // Отправка SMS-кода на телефон
  @Post('auth/send-sms-code')
  async sendSmsCode(@Body() dto: SendSmsCodeDto) {
    const phone = dto.phone?.trim();
    if (!phone || phone.length < 10) {
      throw new BadRequestException('Некорректный номер телефона');
    }

    // Rate limit: не чаще 1 раза в 60 секунд на один номер
    const recent = await this.prisma.smsVerification.findFirst({
      where: {
        phone,
        createdAt: { gte: new Date(Date.now() - 60_000) },
      },
    });
    if (recent) {
      throw new BadRequestException('Подождите минуту перед повторной отправкой');
    }

    // Rate limit: не более 5 SMS на один номер в сутки
    const dailyCount = await this.prisma.smsVerification.count({
      where: {
        phone,
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });
    if (dailyCount >= 5) {
      throw new BadRequestException('Превышен лимит отправок SMS. Попробуйте завтра.');
    }

    // Отправляем SMS через TargetSMS API
    const result = await this.sms.sendCode(phone);
    if (!result.success || !result.code) {
      throw new BadRequestException(result.error || 'Не удалось отправить SMS');
    }

    // Сохраняем код в БД
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 минут
    await this.prisma.smsVerification.create({
      data: { phone, code: result.code, expiresAt },
    });

    // Проверяем, существует ли пользователь
    const user = await this.prisma.user.findFirst({
      where: { phone },
      select: { id: true, name: true },
    });

    return {
      sent: true,
      isNewUser: !user,
      userName: user?.name || null,
    };
  }

  // Проверка SMS-кода + авто-логин/регистрация
  @Post('auth/verify-sms-code')
  async verifySmsCode(@Body() dto: VerifySmsCodeDto) {
    const phone = dto.phone?.trim();
    if (!phone) throw new BadRequestException('Укажите номер телефона');

    const record = await this.prisma.smsVerification.findFirst({
      where: {
        phone,
        code: dto.code,
        usedAt: null,
        expiresAt: { gte: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!record) {
      throw new BadRequestException('Неверный или истёкший код');
    }

    // Помечаем код как использованный
    await this.prisma.smsVerification.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    });

    // Ищем пользователя по телефону
    let user = await this.prisma.user.findFirst({
      where: { phone },
      select: { id: true, login: true, name: true, phone: true, addressLine: true, settlement: true, createdAt: true },
    });

    if (user) {
      // Существующий пользователь — просто логиним
      return this.buildUserResponse(user);
    }

    // Новый пользователь — регистрируем
    const phoneDigits = phone.replace(/\D/g, '');
    const login = `user_${phoneDigits}`;
    const email = `${phoneDigits}@kelsa.local`;
    const passwordHash = await bcrypt.hash(phoneDigits, 10); // заглушка

    const newUser = await this.prisma.user.create({
      data: {
        login,
        email,
        name: dto.name || '',
        phone,
        addressLine: dto.addressLine || '',
        passwordHash,
        settlement: dto.settlement || '',
      },
      select: { id: true, login: true, name: true, phone: true, addressLine: true, settlement: true, createdAt: true },
    });

    return this.buildUserResponse(newUser);
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
