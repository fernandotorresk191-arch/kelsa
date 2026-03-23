import { Body, Controller, Post, Get, Patch, Delete, Param, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { IsEmail, IsString, MinLength, IsOptional, IsArray } from 'class-validator';
import { PrismaService } from 'prisma/prisma.service';
import { JwtGuard } from '../auth/jwt.guard';

class AdminLoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;
}

class CreateAdminDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  role: 'admin' | 'manager';

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsArray()
  permissions?: string[];
}

class UpdateAdminDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @IsOptional()
  @IsString()
  role?: 'admin' | 'manager';

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsArray()
  permissions?: string[];

  @IsOptional()
  isActive?: boolean;
}

const ADMIN_SELECT = {
  id: true,
  email: true,
  role: true,
  name: true,
  phone: true,
  permissions: true,
  isActive: true,
  createdAt: true,
};

@Controller('v1/admin-auth')
export class AdminAuthController {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  @Post('login')
  async login(@Body() dto: AdminLoginDto) {
    const admin = await this.prisma.adminUser.findUnique({
      where: { email: dto.email },
    });

    if (!admin || !admin.isActive) {
      throw new UnauthorizedException('Invalid credentials or account disabled');
    }

    const passwordValid = await bcrypt.compare(dto.password, admin.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const accessToken = this.jwt.sign({
      sub: admin.id,
      email: admin.email,
      role: admin.role,
    });

    return {
      admin: {
        id: admin.id,
        email: admin.email,
        role: admin.role,
        name: admin.name,
        phone: admin.phone,
        permissions: admin.permissions ? JSON.parse(admin.permissions) : null,
      },
      accessToken,
    };
  }

  @Get('me')
  @UseGuards(JwtGuard)
  async getProfile(@Req() req: any) {
    const adminId = req.user.sub;
    const admin = await this.prisma.adminUser.findUnique({
      where: { id: adminId },
      select: { ...ADMIN_SELECT },
    });

    if (!admin) {
      throw new UnauthorizedException('Admin not found');
    }

    return {
      ...admin,
      permissions: admin.permissions ? JSON.parse(admin.permissions) : null,
    };
  }

  // === Управление пользователями (только для admin) ===

  private ensureAdmin(req: any) {
    if (req.user.role !== 'admin') {
      throw new UnauthorizedException('Only admin can manage users');
    }
  }

  @Get('users')
  @UseGuards(JwtGuard)
  async listUsers(@Req() req: any) {
    this.ensureAdmin(req);

    const users = await this.prisma.adminUser.findMany({
      select: { ...ADMIN_SELECT },
      orderBy: { createdAt: 'desc' },
    });

    return users.map(u => ({
      ...u,
      permissions: u.permissions ? JSON.parse(u.permissions) : null,
    }));
  }

  @Post('create')
  @UseGuards(JwtGuard)
  async createAdmin(@Req() req: any, @Body() dto: CreateAdminDto) {
    this.ensureAdmin(req);

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const admin = await this.prisma.adminUser.create({
      data: {
        email: dto.email,
        passwordHash: hashedPassword,
        role: dto.role,
        name: dto.name || null,
        phone: dto.phone || null,
        permissions: dto.permissions ? JSON.stringify(dto.permissions) : null,
      },
      select: { ...ADMIN_SELECT },
    });

    return {
      ...admin,
      permissions: admin.permissions ? JSON.parse(admin.permissions) : null,
    };
  }

  @Patch('users/:id')
  @UseGuards(JwtGuard)
  async updateUser(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateAdminDto) {
    this.ensureAdmin(req);

    const data: any = {};
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.password) data.passwordHash = await bcrypt.hash(dto.password, 10);
    if (dto.role !== undefined) data.role = dto.role;
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.phone !== undefined) data.phone = dto.phone;
    if (dto.permissions !== undefined) data.permissions = JSON.stringify(dto.permissions);
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    const user = await this.prisma.adminUser.update({
      where: { id },
      data,
      select: { ...ADMIN_SELECT },
    });

    return {
      ...user,
      permissions: user.permissions ? JSON.parse(user.permissions) : null,
    };
  }

  @Delete('users/:id')
  @UseGuards(JwtGuard)
  async deleteUser(@Req() req: any, @Param('id') id: string) {
    this.ensureAdmin(req);

    // Нельзя удалить себя
    if (req.user.sub === id) {
      throw new UnauthorizedException('Cannot delete yourself');
    }

    await this.prisma.adminUser.delete({ where: { id } });
    return { success: true };
  }
}
