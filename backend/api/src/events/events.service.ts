import { Injectable } from '@nestjs/common';
import { Subject, Observable, filter } from 'rxjs';

export interface OrderEvent {
  type: 'NEW_ORDER' | 'ORDER_UPDATED';
  order: {
    id: string;
    orderNumber: number;
    customerName: string;
    phone: string;
    totalAmount: number;
    status: string;
    createdAt: Date;
  };
  // userId для фильтрации событий для конкретного пользователя
  userId?: string;
}

@Injectable()
export class EventsService {
  private orderEvents$ = new Subject<OrderEvent>();

  emitOrderEvent(event: OrderEvent): void {
    this.orderEvents$.next(event);
  }

  // Для админов — все события
  getOrderEvents(): Observable<OrderEvent> {
    return this.orderEvents$.asObservable();
  }

  // Для клиентов — только события их заказов
  getOrderEventsForUser(userId: string): Observable<OrderEvent> {
    return this.orderEvents$.asObservable().pipe(
      filter((event) => event.userId === userId),
    );
  }
}
