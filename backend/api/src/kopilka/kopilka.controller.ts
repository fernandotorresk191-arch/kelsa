import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { IsArray, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';
import { PrismaService } from 'prisma/prisma.service';
import { JwtGuard } from '../auth/jwt.guard';

/* ---------- DTO ---------- */

class CreateKopilkaDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsInt()
  @Min(1)
  goalAmount: number;

  @IsString()
  startMonth: string; // "2025-11"

  @IsArray()
  @IsString({ each: true })
  members: string[]; // member names
}

class AddMemberDto {
  @IsString()
  @MinLength(1)
  name: string;
}

class AddContributionDto {
  @IsInt()
  @Min(1)
  amount: number;
}

class TogglePaymentDto {
  @IsString()
  month: string; // "2025-11"
}

class UpdateKopilkaDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  goalAmount?: number;
}

/* ---------- Controller ---------- */

@Controller('v1/kopilka')
export class KopilkaController {
  constructor(private readonly prisma: PrismaService) {}

  /* ── Get my kopilkas (authenticated) ── */
  @UseGuards(JwtGuard)
  @Get('my')
  async getMy(@Req() req: any) {
    const userId = req.user?.sub as string;
    const kopilkas = await this.prisma.kopilka.findMany({
      where: { userId } as any,
      include: { members: { include: { contributions: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return kopilkas;
  }

  /* ── Create kopilka ── */
  @UseGuards(JwtGuard)
  @Post()
  async create(@Req() req: any, @Body() dto: CreateKopilkaDto) {
    const userId = req.user?.sub as string;
    const kopilka = await this.prisma.kopilka.create({
      data: {
        name: dto.name,
        goalAmount: dto.goalAmount,
        startMonth: dto.startMonth,
        userId,
        members: {
          create: dto.members.map((name) => ({ name })),
        },
      } as any,
      include: { members: { include: { contributions: true } } },
    });
    return kopilka;
  }

  /* ── Get by shareId ── */
  @Get(':shareId')
  async getByShareId(@Param('shareId') shareId: string) {
    const kopilka = await this.prisma.kopilka.findUnique({
      where: { shareId },
      include: {
        members: {
          include: { contributions: true },
        },
      },
    });
    if (!kopilka) throw new NotFoundException('Копилка не найдена');
    return kopilka;
  }

  /* ── Update kopilka name/goal ── */
  @Patch(':shareId')
  async update(
    @Param('shareId') shareId: string,
    @Body() dto: UpdateKopilkaDto,
  ) {
    const kopilka = await this.prisma.kopilka.findUnique({ where: { shareId } });
    if (!kopilka) throw new NotFoundException('Копилка не найдена');

    const data: Record<string, any> = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.goalAmount !== undefined) data.goalAmount = dto.goalAmount;

    return this.prisma.kopilka.update({
      where: { shareId },
      data,
      include: { members: { include: { contributions: true } } },
    });
  }

  /* ── Delete kopilka ── */
  @Delete(':shareId')
  async remove(@Param('shareId') shareId: string) {
    const kopilka = await this.prisma.kopilka.findUnique({ where: { shareId } });
    if (!kopilka) throw new NotFoundException('Копилка не найдена');
    await this.prisma.kopilka.delete({ where: { shareId } });
    return { ok: true };
  }

  /* ── Add member ── */
  @Post(':shareId/members')
  async addMember(
    @Param('shareId') shareId: string,
    @Body() dto: AddMemberDto,
  ) {
    const kopilka = await this.prisma.kopilka.findUnique({ where: { shareId } });
    if (!kopilka) throw new NotFoundException('Копилка не найдена');

    await this.prisma.kopilkaMember.create({
      data: { kopilkaId: kopilka.id, name: dto.name },
    });

    return this.getByShareId(shareId);
  }

  /* ── Remove member ── */
  @Delete(':shareId/members/:memberId')
  async removeMember(
    @Param('shareId') shareId: string,
    @Param('memberId') memberId: string,
  ) {
    const kopilka = await this.prisma.kopilka.findUnique({ where: { shareId } });
    if (!kopilka) throw new NotFoundException('Копилка не найдена');

    await this.prisma.kopilkaMember.delete({ where: { id: memberId } });
    return this.getByShareId(shareId);
  }

  /* ── Add contribution line for a member ── */
  @Post(':shareId/members/:memberId/contributions')
  async addContribution(
    @Param('shareId') shareId: string,
    @Param('memberId') memberId: string,
    @Body() dto: AddContributionDto,
  ) {
    const kopilka = await this.prisma.kopilka.findUnique({ where: { shareId } });
    if (!kopilka) throw new NotFoundException('Копилка не найдена');

    await this.prisma.kopilkaContribution.create({
      data: { memberId, amount: dto.amount },
    });

    return this.getByShareId(shareId);
  }

  /* ── Remove contribution line ── */
  @Delete(':shareId/contributions/:contributionId')
  async removeContribution(
    @Param('shareId') shareId: string,
    @Param('contributionId') contributionId: string,
  ) {
    const kopilka = await this.prisma.kopilka.findUnique({ where: { shareId } });
    if (!kopilka) throw new NotFoundException('Копилка не найдена');

    await this.prisma.kopilkaContribution.delete({
      where: { id: contributionId },
    });

    return this.getByShareId(shareId);
  }

  /* ── Toggle payment for a contribution in a specific month ── */
  @Post(':shareId/contributions/:contributionId/toggle')
  async togglePayment(
    @Param('shareId') shareId: string,
    @Param('contributionId') contributionId: string,
    @Body() dto: TogglePaymentDto,
  ) {
    const kopilka = await this.prisma.kopilka.findUnique({ where: { shareId } });
    if (!kopilka) throw new NotFoundException('Копилка не найдена');

    const contribution = await this.prisma.kopilkaContribution.findUnique({
      where: { id: contributionId },
    });
    if (!contribution) throw new NotFoundException('Взнос не найден');

    const paidMonths: string[] = JSON.parse(contribution.paidMonths);
    const idx = paidMonths.indexOf(dto.month);
    if (idx >= 0) {
      paidMonths.splice(idx, 1);
    } else {
      paidMonths.push(dto.month);
    }

    await this.prisma.kopilkaContribution.update({
      where: { id: contributionId },
      data: { paidMonths: JSON.stringify(paidMonths) },
    });

    return this.getByShareId(shareId);
  }
}
