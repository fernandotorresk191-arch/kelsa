/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { Controller, Sse, UseGuards, Req } from '@nestjs/common';
import { Observable, map, interval, merge } from 'rxjs';
import { EventsService, OrderEvent } from '../events/events.service';
import { CourierJwtGuard } from './courier-jwt.guard';

interface MessageEvent {
  data: string;
  type?: string;
  id?: string;
  retry?: number;
}

interface CourierRequest {
  user: { sub: string; login: string; role: string };
}

@Controller('v1/courier/events')
export class CourierEventsController {
  constructor(private readonly eventsService: EventsService) {}

  // SSE для курьеров — только их заказы
  @Sse('orders')
  @UseGuards(CourierJwtGuard)
  ordersStream(@Req() req: CourierRequest): Observable<MessageEvent> {
    const courierId = req.user.sub;

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

    // Order events stream filtered by courier
    const orders$ = this.eventsService.getOrderEventsForCourier(courierId).pipe(
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
