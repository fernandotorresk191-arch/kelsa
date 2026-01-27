import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as webpush from 'web-push';
import { PrismaService } from 'prisma/prisma.service';

interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: Record<string, unknown>;
}

@Injectable()
export class PushService {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    const publicKey = this.configService.get<string>('VAPID_PUBLIC_KEY');
    const privateKey = this.configService.get<string>('VAPID_PRIVATE_KEY');
    const subject = this.configService.get<string>('VAPID_SUBJECT') || 'mailto:admin@gokelsa.ru';

    if (publicKey && privateKey) {
      webpush.setVapidDetails(subject, publicKey, privateKey);
    }
  }

  getPublicKey(): string {
    return this.configService.get<string>('VAPID_PUBLIC_KEY') || '';
  }

  // Сохранить подписку курьера
  async saveSubscription(courierId: string, subscription: PushSubscription): Promise<void> {
    await this.prisma.courier.update({
      where: { id: courierId },
      data: { pushSubscription: JSON.stringify(subscription) },
    });
  }

  // Удалить подписку курьера
  async removeSubscription(courierId: string): Promise<void> {
    await this.prisma.courier.update({
      where: { id: courierId },
      data: { pushSubscription: null },
    });
  }

  // Отправить push-уведомление курьеру
  async sendToCourier(courierId: string, payload: NotificationPayload): Promise<boolean> {
    const courier = await this.prisma.courier.findUnique({
      where: { id: courierId },
      select: { pushSubscription: true },
    });

    if (!courier?.pushSubscription) {
      console.log(`[Push] Courier ${courierId} has no push subscription`);
      return false;
    }

    try {
      const subscription = JSON.parse(courier.pushSubscription) as PushSubscription;
      
      await webpush.sendNotification(
        subscription,
        JSON.stringify(payload),
      );
      
      console.log(`[Push] Notification sent to courier ${courierId}`);
      return true;
    } catch (error: unknown) {
      const err = error as { statusCode?: number };
      console.error(`[Push] Failed to send to courier ${courierId}:`, error);
      
      // Если подписка невалидна (410 Gone), удаляем её
      if (err.statusCode === 410) {
        await this.removeSubscription(courierId);
      }
      
      return false;
    }
  }

  // Отправить уведомление о новом заказе
  async notifyNewOrder(courierId: string, orderNumber: number, address: string): Promise<boolean> {
    return this.sendToCourier(courierId, {
      title: '🚚 Новый заказ!',
      body: `Заказ #${orderNumber}\n${address}`,
      icon: '/cur192.png',
      badge: '/cur192.png',
      data: {
        type: 'NEW_ORDER',
        orderNumber,
      },
    });
  }
}
