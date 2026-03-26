import { Body, Controller, Post, Get, Patch, Delete, Param, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { IsEmail, IsString, MinLength, IsOptional, IsArray } from 'class-validator';
import { PrismaService } from 'prisma/prisma.service';
import { JwtGuard } from '../auth/jwt.guard';
import { AdminGuard } from './admin.guard';
import { Roles } from './roles.decorator';

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
  role: 'superadmin' | 'admin' | 'manager';

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
  @IsArray()
  darkstoreIds?: string[];
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
  role?: 'superadmin' | 'admin' | 'manager';

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

  @IsOptional()
  @IsArray()
  darkstoreIds?: string[];
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

  private formatAdmin(admin: any) {
    return {
      ...admin,
      permissions: admin.permissions ? JSON.parse(admin.permissions) : null,
    };
  }

  private async getAdminDarkstores(adminId: string) {
    const assignments = await this.prisma.adminUserDarkstore.findMany({
      where: { adminUserId: adminId },
      include: { darkstore: true },
    });
    return assignments.map(a => a.darkstore);
  }

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

    const darkstores = admin.role === 'superadmin'
      ? await this.prisma.darkstore.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } })
      : await this.getAdminDarkstores(admin.id);

    return {
      admin: {
        id: admin.id,
        email: admin.email,
        role: admin.role,
        name: admin.name,
        phone: admin.phone,
        permissions: admin.permissions ? JSON.parse(admin.permissions) : null,
      },
      darkstores,
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

    const darkstores = admin.role === 'superadmin'
      ? await this.prisma.darkstore.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } })
      : await this.getAdminDarkstores(adminId);

    return {
      ...this.formatAdmin(admin),
      darkstores,
    };
  }

  // === Управление пользователями (superadmin / admin) ===

  private ensureAdmin(req: any) {
    if (!['superadmin', 'admin'].includes(req.user.role)) {
      throw new UnauthorizedException('Only admin or superadmin can manage users');
    }
  }

  @Get('users')
  @UseGuards(AdminGuard)
  @Roles('superadmin', 'admin')
  async listUsers(@Req() req: any) {
    const users = await this.prisma.adminUser.findMany({
      select: {
        ...ADMIN_SELECT,
        darkstores: {
          include: { darkstore: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return users.map(u => ({
      ...this.formatAdmin(u),
      darkstores: u.darkstores.map(d => d.darkstore),
    }));
  }

  @Post('create')
  @UseGuards(AdminGuard)
  @Roles('superadmin', 'admin')
  async createAdmin(@Req() req: any, @Body() dto: CreateAdminDto) {
    // Only superadmin can create superadmin
    if (dto.role === 'superadmin' && req.user.role !== 'superadmin') {
      throw new UnauthorizedException('Only superadmin can create superadmin users');
    }

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

    // Assign darkstores
    if (dto.darkstoreIds?.length) {
      await this.prisma.adminUserDarkstore.createMany({
        data: dto.darkstoreIds.map(darkstoreId => ({
          adminUserId: admin.id,
          darkstoreId,
        })),
      });
    }

    const darkstores = await this.getAdminDarkstores(admin.id);

    return {
      ...this.formatAdmin(admin),
      darkstores,
    };
  }

  @Patch('users/:id')
  @UseGuards(AdminGuard)
  @Roles('superadmin', 'admin')
  async updateUser(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateAdminDto) {
    // Only superadmin can assign superadmin role
    if (dto.role === 'superadmin' && req.user.role !== 'superadmin') {
      throw new UnauthorizedException('Only superadmin can assign superadmin role');
    }

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

    // Update darkstore assignments if provided
    if (dto.darkstoreIds !== undefined) {
      await this.prisma.adminUserDarkstore.deleteMany({
        where: { adminUserId: id },
      });
      if (dto.darkstoreIds.length) {
        await this.prisma.adminUserDarkstore.createMany({
          data: dto.darkstoreIds.map(darkstoreId => ({
            adminUserId: id,
            darkstoreId,
          })),
        });
      }
    }

    const darkstores = await this.getAdminDarkstores(id);

    return {
      ...this.formatAdmin(user),
      darkstores,
    };
  }

  @Delete('users/:id')
  @UseGuards(AdminGuard)
  @Roles('superadmin', 'admin')
  async deleteUser(@Req() req: any, @Param('id') id: string) {
    // Нельзя удалить себя
    if (req.user.sub === id) {
      throw new UnauthorizedException('Cannot delete yourself');
    }

    // Only superadmin can delete superadmin
    const target = await this.prisma.adminUser.findUnique({ where: { id } });
    if (target?.role === 'superadmin' && req.user.role !== 'superadmin') {
      throw new UnauthorizedException('Only superadmin can delete superadmin users');
    }

    await this.prisma.adminUserDarkstore.deleteMany({ where: { adminUserId: id } });
    await this.prisma.adminUser.delete({ where: { id } });
    return { success: true };
  }
}
