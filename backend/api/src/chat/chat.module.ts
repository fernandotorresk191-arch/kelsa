import { Module } from '@nestjs/common';
import { PrismaModule } from 'prisma/prisma.module';
import { PushModule } from '../push/push.module';
import { ChatController } from './chat.controller';

@Module({
  imports: [PrismaModule, PushModule],
  controllers: [ChatController],
})
export class ChatModule {}
