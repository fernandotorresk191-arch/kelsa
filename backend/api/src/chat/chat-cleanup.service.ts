import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from 'prisma/prisma.service';
import { CronRegistryService } from '../admin/cron-registry.service';
import { join } from 'path';
import { existsSync, unlinkSync } from 'fs';

@Injectable()
export class ChatCleanupService implements OnModuleInit {
  private readonly logger = new Logger(ChatCleanupService.name);
  private readonly CHAT_UPLOADS_DIR = join(process.cwd(), 'uploads', 'chat');
  private readonly RETENTION_DAYS = 7;

  constructor(
    private prisma: PrismaService,
    private cronRegistry: CronRegistryService,
  ) {}

  onModuleInit() {
    this.cronRegistry.register(
      'chat-image-cleanup',
      'Удаление фото из чатов старше 7 дней. Очищает файлы с диска и обнуляет imageUrl в БД.',
      'Каждый день в 3:00',
    );
  }

  // Каждый день в 3:00 ночи
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async cleanupOldChatImages() {
    const startTime = Date.now();
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.RETENTION_DAYS);

    // Находим сообщения с картинками старше 7 дней
    const messages = await this.prisma.chatMessage.findMany({
      where: {
        imageUrl: { not: null },
        createdAt: { lt: cutoffDate },
      },
      select: { id: true, imageUrl: true },
    });

    if (messages.length === 0) {
      const duration = Date.now() - startTime;
      this.cronRegistry.logSuccess('chat-image-cleanup', 'Нет старых фото для удаления', duration);
      return;
    }

    let deletedFiles = 0;
    let deletedRecords = 0;

    for (const msg of messages) {
      if (msg.imageUrl) {
        // imageUrl = "/uploads/chat/filename.jpg" → извлекаем имя файла
        const filename = msg.imageUrl.replace('/uploads/chat/', '');
        const filePath = join(this.CHAT_UPLOADS_DIR, filename);

        if (existsSync(filePath)) {
          try {
            unlinkSync(filePath);
            deletedFiles++;
          } catch {
            this.logger.warn(`Не удалось удалить файл: ${filePath}`);
          }
        }
      }

      // Очищаем imageUrl в БД
      await this.prisma.chatMessage.update({
        where: { id: msg.id },
        data: { imageUrl: null },
      });
      deletedRecords++;
    }

    this.logger.log(
      `Очистка чат-фото: удалено ${deletedFiles} файлов, обновлено ${deletedRecords} записей`,
    );

    const duration = Date.now() - startTime;
    this.cronRegistry.logSuccess(
      'chat-image-cleanup',
      `Удалено ${deletedFiles} файлов, обновлено ${deletedRecords} записей`,
      duration,
    );
    } catch (error) {
      const duration = Date.now() - startTime;
      const message = error instanceof Error ? error.message : 'Неизвестная ошибка';
      this.logger.error(`Ошибка очистки чат-фото: ${message}`);
      this.cronRegistry.logError('chat-image-cleanup', message, duration);
    }
  }
}
