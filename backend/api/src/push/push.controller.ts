import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { PushService } from './push.service';
import { CourierJwtGuard } from '../courier/courier-jwt.guard';

interface CourierRequest {
  user: {
    sub: string;
    login: string;
  };
}

interface PushSubscriptionDto {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

@Controller('v1/courier/push')
export class PushController {
  constructor(private pushService: PushService) {}

  // Получить публичный VAPID ключ
  @Get('vapid-key')
  getVapidKey() {
    return { publicKey: this.pushService.getPublicKey() };
  }

  // Подписаться на push-уведомления
  @Post('subscribe')
  @UseGuards(CourierJwtGuard)
  async subscribe(
    @Body() subscription: PushSubscriptionDto,
    @Req() req: CourierRequest,
  ) {
    await this.pushService.saveSubscription(req.user.sub, subscription);
    return { success: true, message: 'Subscribed to push notifications' };
  }

  // Отписаться от push-уведомлений
  @Delete('subscribe')
  @UseGuards(CourierJwtGuard)
  async unsubscribe(@Req() req: CourierRequest) {
    await this.pushService.removeSubscription(req.user.sub);
    return { success: true, message: 'Unsubscribed from push notifications' };
  }
}
