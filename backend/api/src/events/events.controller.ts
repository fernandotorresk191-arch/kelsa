/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import {
  Controller,
  Sse,
  UseGuards,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { Observable, map, interval, merge } from 'rxjs';
import { EventsService, OrderEvent } from './events.service';
import { JwtGuard } from '../auth/jwt.guard';

interface MessageEvent {
  data: string;
  type?: string;
  id?: string;
  retry?: number;
}

interface AuthRequest {
  user: { sub: string; role?: string };
}

@Controller('v1/events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  // SSE для админов — все заказы
  @Sse('orders')
  @UseGuards(JwtGuard)
  ordersStream(@Req() req: AuthRequest): Observable<MessageEvent> {
    // Check admin access
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      throw new UnauthorizedException('Admin access required');
    }

    // Heartbeat every 30 seconds to keep connection alive
    const heartbeat$ = interval(30000).pipe(
      map(() => ({
        data: JSON.stringify({
          type: 'heartbeat',
          timestamp: new Date().toISOString(),
        }),
        type: 'heartbeat',
      })),
    );

    // Order events stream
    const orders$ = this.eventsService.getOrderEvents().pipe(
      map((event: OrderEvent) => ({
        data: JSON.stringify(event),
        type: 'order',
      })),
    );

    return merge(heartbeat$, orders$);
  }

  // SSE для клиентов — только их заказы
  @Sse('my-orders')
  @UseGuards(JwtGuard)
  myOrdersStream(@Req() req: AuthRequest): Observable<MessageEvent> {
    const userId = req.user.sub;

    // Heartbeat every 30 seconds to keep connection alive
    const heartbeat$ = interval(30000).pipe(
      map(() => ({
        data: JSON.stringify({
          type: 'heartbeat',
          timestamp: new Date().toISOString(),
        }),
        type: 'heartbeat',
      })),
    );

    // Order events stream filtered by user
    const orders$ = this.eventsService.getOrderEventsForUser(userId).pipe(
      map((event: OrderEvent) => ({
        data: JSON.stringify({
          type: event.type,
          order: event.order,
        }),
        type: 'order',
      })),
    );

    return merge(heartbeat$, orders$);
  }
}
