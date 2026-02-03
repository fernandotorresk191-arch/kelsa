import {
  Body,
  Controller,
  Post,
  Get,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { IsString, MinLength } from 'class-validator';
import { PrismaService } from 'prisma/prisma.service';
import { CourierJwtGuard } from './courier-jwt.guard';

class CourierLoginDto {
  @IsString()
  @MinLength(3)
  login: string;

  @IsString()
  @MinLength(4)
  password: string;
}

interface CourierRequest {
  user: {
    sub: string;
    login: string;
    role: string;
  };
}

@Controller('v1/courier-auth')
export class CourierAuthController {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  @Post('login')
  async login(@Body() dto: CourierLoginDto) {
    const courier = await this.prisma.courier.findUnique({
      where: { login: dto.login },
    });

    if (!courier || !courier.isActive) {
      throw new UnauthorizedException('Неверный логин или пароль');
    }

    const passwordValid = await bcrypt.compare(
      dto.password,
      courier.passwordHash,
    );
    if (!passwordValid) {
      throw new UnauthorizedException('Неверный логин или пароль');
    }

    const accessToken = this.jwt.sign({
      sub: courier.id,
      login: courier.login,
      fullName: courier.fullName,
      role: 'courier',
    });

    return {
      courier: {
        id: courier.id,
        fullName: courier.fullName,
        login: courier.login,
        phone: courier.phone,
        status: courier.status,
      },
      accessToken,
    };
  }

  @Get('me')
  @UseGuards(CourierJwtGuard)
  async getProfile(@Req() req: CourierRequest) {
    const courierId = req.user.sub;
    const courier = await this.prisma.courier.findUnique({
      where: { id: courierId },
      select: {
        id: true,
        fullName: true,
        login: true,
        phone: true,
        carBrand: true,
        carNumber: true,
        status: true,
        isActive: true,
      },
    });

    if (!courier || !courier.isActive) {
      throw new UnauthorizedException('Курьер не найден или деактивирован');
    }

    return courier;
  }
}
