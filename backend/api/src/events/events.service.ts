import { Injectable } from '@nestjs/common';
import { Subject, Observable, filter } from 'rxjs';

export interface OrderEvent {
  type: 'NEW_ORDER' | 'ORDER_UPDATED' | 'ORDER_ASSIGNED_TO_COURIER';
  order: {
    id: string;
    orderNumber: number;
    customerName: string;
    phone: string;
    totalAmount: number;
    status: string;
    createdAt: Date;
    addressLine?: string;
  };
  // userId для фильтрации событий для конкретного пользователя
  userId?: string;
  // courierId для фильтрации событий для конкретного курьера
  courierId?: string;
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

  // Для курьеров — только события их заказов
  getOrderEventsForCourier(courierId: string): Observable<OrderEvent> {
    return this.orderEvents$.asObservable().pipe(
      filter((event) => event.courierId === courierId),
    );
  }
}
