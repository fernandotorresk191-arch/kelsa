/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
  UnauthorizedException,
  BadRequestException,
  UseInterceptors,
  UploadedFile,
  Patch,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { randomUUID } from 'crypto';
import { IsOptional, IsString, IsNumber } from 'class-validator';
import { PrismaService } from 'prisma/prisma.service';
import { JwtGuard } from '../auth/jwt.guard';
import { EventsService } from '../events/events.service';
import { PushService } from '../push/push.service';

// Создаём директорию для загрузок чата
const CHAT_UPLOADS_DIR = join(process.cwd(), 'uploads', 'chat');
if (!existsSync(CHAT_UPLOADS_DIR)) {
  mkdirSync(CHAT_UPLOADS_DIR, { recursive: true });
}

const imageFileFilter = (
  _req: Express.Request,
  file: Express.Multer.File,
  callback: (error: Error | null, acceptFile: boolean) => void,
) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (allowedMimes.includes(file.mimetype)) {
    callback(null, true);
  } else {
    callback(new BadRequestException('Разрешены только изображения'), false);
  }
};

const generateFilename = (
  _req: Express.Request,
  file: Express.Multer.File,
  callback: (error: Error | null, filename: string) => void,
) => {
  const uniqueName = `${randomUUID()}${extname(file.originalname)}`;
  callback(null, uniqueName);
};

class SendMessageDto {
  @IsOptional()
  @IsString()
  text?: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;
}

interface AuthRequest {
  user: { sub: string; role?: string };
}

@Controller('v1')
@UseGuards(JwtGuard)
export class ChatController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsService: EventsService,
    private readonly pushService: PushService,
  ) {}

  // ==================== ADMIN ENDPOINTS ====================

  // GET /v1/admin/orders/:orderId/chat — получить все сообщения чата
  @Get('admin/orders/:orderId/chat')
  async getAdminChat(
    @Param('orderId') orderId: string,
    @Req() req: AuthRequest,
  ) {
    this.checkAdmin(req);

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, orderNumber: true },
    });
    if (!order) throw new BadRequestException('Заказ не найден');

    const messages = await this.prisma.chatMessage.findMany({
      where: { orderId },
      orderBy: { createdAt: 'asc' },
    });

    return { orderNumber: order.orderNumber, messages };
  }

  // POST /v1/admin/orders/:orderId/chat — отправить текстовое сообщение от менеджера
  @Post('admin/orders/:orderId/chat')
  async sendAdminMessage(
    @Param('orderId') orderId: string,
    @Body() dto: SendMessageDto,
    @Req() req: AuthRequest,
  ) {
    this.checkAdmin(req);

    if (!dto.text?.trim()) {
      throw new BadRequestException('Текст сообщения обязателен');
    }

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, orderNumber: true, userId: true },
    });
    if (!order) throw new BadRequestException('Заказ не найден');

    const message = await this.prisma.chatMessage.create({
      data: {
        orderId,
        sender: 'MANAGER',
        text: dto.text.trim(),
      },
    });

    // SSE для клиента
    this.eventsService.emitChatEvent({
      type: 'NEW_MESSAGE',
      message: {
        id: message.id,
        orderId: message.orderId,
        orderNumber: order.orderNumber,
        sender: 'MANAGER',
        text: message.text,
        imageUrl: null,
        latitude: null,
        longitude: null,
        isRead: false,
        createdAt: message.createdAt,
      },
      userId: order.userId,
    });

    // Push-уведомление клиенту
    await this.sendPushToUser(order.userId, order.orderNumber, dto.text.trim());

    return message;
  }

  // POST /v1/admin/orders/:orderId/chat/image — отправить изображение от менеджера
  @Post('admin/orders/:orderId/chat/image')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: CHAT_UPLOADS_DIR,
        filename: generateFilename,
      }),
      fileFilter: imageFileFilter,
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async sendAdminImage(
    @Param('orderId') orderId: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: AuthRequest,
  ) {
    this.checkAdmin(req);
    if (!file) throw new BadRequestException('Файл не загружен');

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, orderNumber: true, userId: true },
    });
    if (!order) throw new BadRequestException('Заказ не найден');

    const imageUrl = `/uploads/chat/${file.filename}`;
    const message = await this.prisma.chatMessage.create({
      data: {
        orderId,
        sender: 'MANAGER',
        imageUrl,
      },
    });

    this.eventsService.emitChatEvent({
      type: 'NEW_MESSAGE',
      message: {
        id: message.id,
        orderId: message.orderId,
        orderNumber: order.orderNumber,
        sender: 'MANAGER',
        text: null,
        imageUrl,
        latitude: null,
        longitude: null,
        isRead: false,
        createdAt: message.createdAt,
      },
      userId: order.userId,
    });

    await this.sendPushToUser(order.userId, order.orderNumber, '📷 Фото');

    return message;
  }

  // PATCH /v1/admin/orders/:orderId/chat/read — пометить сообщения клиента как прочитанные
  @Patch('admin/orders/:orderId/chat/read')
  async markAdminRead(
    @Param('orderId') orderId: string,
    @Req() req: AuthRequest,
  ) {
    this.checkAdmin(req);

    const result = await this.prisma.chatMessage.updateMany({
      where: { orderId, sender: 'CLIENT', isRead: false },
      data: { isRead: true },
    });

    // Если были обновлены сообщения — отправляем SSE событие клиенту
    if (result.count > 0) {
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        select: { userId: true },
      });
      if (order) {
        this.eventsService.emitChatEvent({
          type: 'MESSAGES_READ',
          orderId,
          readBy: 'MANAGER',
          userId: order.userId,
        });
      }
    }

    return { ok: true };
  }

  // GET /v1/admin/orders/unread-counts — количество непрочитанных сообщений по заказам
  @Get('admin/orders/unread-counts')
  async getUnreadCounts(@Req() req: AuthRequest) {
    this.checkAdmin(req);

    const counts = await this.prisma.chatMessage.groupBy({
      by: ['orderId'],
      where: { sender: 'CLIENT', isRead: false },
      _count: { id: true },
    });

    const result: Record<string, number> = {};
    for (const c of counts) {
      result[c.orderId] = c._count.id;
    }
    return result;
  }

  // PATCH /v1/admin/orders/:orderId/geolocation — сохранить геопозицию клиента из чата в заказ
  @Patch('admin/orders/:orderId/geolocation')
  async setOrderGeolocation(
    @Param('orderId') orderId: string,
    @Body() body: { latitude: number; longitude: number },
    @Req() req: AuthRequest,
  ) {
    this.checkAdmin(req);

    if (body.latitude == null || body.longitude == null) {
      throw new BadRequestException('Координаты обязательны');
    }

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, orderNumber: true, userId: true, status: true, totalAmount: true, createdAt: true },
    });
    if (!order) throw new BadRequestException('Заказ не найден');

    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        customerLatitude: body.latitude,
        customerLongitude: body.longitude,
      },
    });

    // Уведомляем через SSE об обновлении заказа (геопозиция добавлена)
    const user = await this.prisma.user.findUnique({
      where: { id: order.userId },
      select: { name: true, phone: true },
    });

    this.eventsService.emitOrderEvent({
      type: 'ORDER_UPDATED',
      order: {
        id: orderId,
        orderNumber: order.orderNumber,
        customerName: user?.name || '',
        phone: user?.phone || '',
        totalAmount: order.totalAmount,
        status: order.status,
        createdAt: order.createdAt,
      },
      userId: order.userId,
    });

    return { ok: true };
  }

  // ==================== CUSTOMER ENDPOINTS ====================

  // GET /v1/orders/:orderNumber/chat — получить чат заказа
  @Get('orders/:orderNumber/chat')
  async getCustomerChat(
    @Param('orderNumber') orderNumber: string,
    @Req() req: AuthRequest,
  ) {
    const userId = req.user.sub;
    const order = await this.prisma.order.findUnique({
      where: { orderNumber: parseInt(orderNumber, 10) },
      select: { id: true, orderNumber: true, userId: true },
    });
    if (!order || order.userId !== userId) {
      throw new UnauthorizedException('Заказ не найден');
    }

    const messages = await this.prisma.chatMessage.findMany({
      where: { orderId: order.id },
      orderBy: { createdAt: 'asc' },
    });

    return { orderNumber: order.orderNumber, messages };
  }

  // POST /v1/orders/:orderNumber/chat — отправить текст от клиента
  @Post('orders/:orderNumber/chat')
  async sendCustomerMessage(
    @Param('orderNumber') orderNumber: string,
    @Body() dto: SendMessageDto,
    @Req() req: AuthRequest,
  ) {
    const userId = req.user.sub;
    const order = await this.prisma.order.findUnique({
      where: { orderNumber: parseInt(orderNumber, 10) },
      select: { id: true, orderNumber: true, userId: true },
    });
    if (!order || order.userId !== userId) {
      throw new UnauthorizedException('Заказ не найден');
    }

    if (!dto.text?.trim() && dto.latitude == null) {
      throw new BadRequestException('Отправьте текст или геопозицию');
    }

    const message = await this.prisma.chatMessage.create({
      data: {
        orderId: order.id,
        sender: 'CLIENT',
        text: dto.text?.trim() || null,
        latitude: dto.latitude ?? null,
        longitude: dto.longitude ?? null,
      },
    });

    this.eventsService.emitChatEvent({
      type: 'NEW_MESSAGE',
      message: {
        id: message.id,
        orderId: message.orderId,
        orderNumber: order.orderNumber,
        sender: 'CLIENT',
        text: message.text,
        imageUrl: null,
        latitude: message.latitude,
        longitude: message.longitude,
        isRead: false,
        createdAt: message.createdAt,
      },
      userId,
    });

    return message;
  }

  // POST /v1/orders/:orderNumber/chat/image — отправить фото от клиента
  @Post('orders/:orderNumber/chat/image')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: CHAT_UPLOADS_DIR,
        filename: generateFilename,
      }),
      fileFilter: imageFileFilter,
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async sendCustomerImage(
    @Param('orderNumber') orderNumber: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: AuthRequest,
  ) {
    const userId = req.user.sub;
    if (!file) throw new BadRequestException('Файл не загружен');

    const order = await this.prisma.order.findUnique({
      where: { orderNumber: parseInt(orderNumber, 10) },
      select: { id: true, orderNumber: true, userId: true },
    });
    if (!order || order.userId !== userId) {
      throw new UnauthorizedException('Заказ не найден');
    }

    const imageUrl = `/uploads/chat/${file.filename}`;
    const message = await this.prisma.chatMessage.create({
      data: {
        orderId: order.id,
        sender: 'CLIENT',
        imageUrl,
      },
    });

    this.eventsService.emitChatEvent({
      type: 'NEW_MESSAGE',
      message: {
        id: message.id,
        orderId: message.orderId,
        orderNumber: order.orderNumber,
        sender: 'CLIENT',
        text: null,
        imageUrl,
        latitude: null,
        longitude: null,
        isRead: false,
        createdAt: message.createdAt,
      },
      userId,
    });

    return message;
  }

  // PATCH /v1/orders/:orderNumber/chat/read — пометить сообщения менеджера как прочитанные
  @Patch('orders/:orderNumber/chat/read')
  async markCustomerRead(
    @Param('orderNumber') orderNumber: string,
    @Req() req: AuthRequest,
  ) {
    const userId = req.user.sub;
    const order = await this.prisma.order.findUnique({
      where: { orderNumber: parseInt(orderNumber, 10) },
      select: { id: true, userId: true },
    });
    if (!order || order.userId !== userId) {
      throw new UnauthorizedException('Заказ не найден');
    }

    const result = await this.prisma.chatMessage.updateMany({
      where: { orderId: order.id, sender: 'MANAGER', isRead: false },
      data: { isRead: true },
    });

    // Если были обновлены сообщения — отправляем SSE событие админам
    if (result.count > 0) {
      this.eventsService.emitChatEvent({
        type: 'MESSAGES_READ',
        orderId: order.id,
        readBy: 'CLIENT',
        userId,
      });
    }

    return { ok: true };
  }

  // GET /v1/me/unread-counts — количество непрочитанных сообщений от менеджера по заказам клиента
  @Get('me/unread-counts')
  async getMyUnreadCounts(@Req() req: AuthRequest) {
    const userId = req.user.sub;

    const orders = await this.prisma.order.findMany({
      where: { userId },
      select: { id: true, orderNumber: true },
    });

    if (!orders.length) return {};

    const orderIds = orders.map((o) => o.id);

    const counts = await this.prisma.chatMessage.groupBy({
      by: ['orderId'],
      where: { orderId: { in: orderIds }, sender: 'MANAGER', isRead: false },
      _count: { id: true },
    });

    const result: Record<number, number> = {};
    const idToNumber = new Map(orders.map((o) => [o.id, o.orderNumber]));
    for (const c of counts) {
      const orderNumber = idToNumber.get(c.orderId);
      if (orderNumber != null) {
        result[orderNumber] = c._count.id;
      }
    }
    return result;
  }

  // ==================== PUSH-подписка клиента ====================

  // POST /v1/push/subscribe — подписка клиента на push-уведомления
  @Post('push/subscribe')
  async subscribeUser(
    @Body() body: { subscription: { endpoint: string; keys: { p256dh: string; auth: string } } },
    @Req() req: AuthRequest,
  ) {
    const userId = req.user.sub;
    await this.prisma.user.update({
      where: { id: userId },
      data: { pushSubscription: JSON.stringify(body.subscription) },
    });
    return { ok: true };
  }

  // GET /v1/push/vapid-key — публичный ключ
  @Get('push/vapid-key')
  getVapidKey() {
    return { key: this.pushService.getPublicKey() };
  }

  // ==================== HELPERS ====================

  private checkAdmin(req: AuthRequest) {
    if (req.user?.role !== 'admin' && req.user?.role !== 'manager') {
      throw new UnauthorizedException('Admin access required');
    }
  }

  private async sendPushToUser(userId: string, orderNumber: number, body: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { pushSubscription: true },
    });
    if (!user?.pushSubscription) return;

    try {
      const webpush = await import('web-push');
      const subscription = JSON.parse(user.pushSubscription);
      await webpush.sendNotification(
        subscription,
        JSON.stringify({
          title: `Чат по заказу #${orderNumber}`,
          body,
          icon: '/icons/icon-192.png',
          badge: '/icons/icon-192.png',
          data: {
            type: 'CHAT_MESSAGE',
            orderNumber,
          },
        }),
      );
    } catch (error: unknown) {
      const err = error as { statusCode?: number };
      if (err.statusCode === 410) {
        await this.prisma.user.update({
          where: { id: userId },
          data: { pushSubscription: null },
        });
      }
    }
  }
}
