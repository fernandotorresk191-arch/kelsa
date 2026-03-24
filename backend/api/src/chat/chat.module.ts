import { Module } from '@nestjs/common';
import { PrismaModule } from 'prisma/prisma.module';
import { PushModule } from '../push/push.module';
import { ChatController } from './chat.controller';
import { ChatCleanupService } from './chat-cleanup.service';

@Module({
  imports: [PrismaModule, PushModule],
  controllers: [ChatController],
  providers: [ChatCleanupService],
})
export class ChatModule {}
