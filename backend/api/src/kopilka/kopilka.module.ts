import { Module } from '@nestjs/common';
import { PrismaModule } from 'prisma/prisma.module';
import { KopilkaController } from './kopilka.controller';

@Module({
  imports: [PrismaModule],
  controllers: [KopilkaController],
})
export class KopilkaModule {}
