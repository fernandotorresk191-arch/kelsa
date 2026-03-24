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

export interface ChatEvent {
  type: 'NEW_MESSAGE';
  message: {
    id: string;
    orderId: string;
    orderNumber: number;
    sender: 'MANAGER' | 'CLIENT';
    text?: string | null;
    imageUrl?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    createdAt: Date;
  };
  userId?: string;     // Для фильтрации — владелец заказа
}

@Injectable()
export class EventsService {
  private orderEvents$ = new Subject<OrderEvent>();
  private chatEvents$ = new Subject<ChatEvent>();

  emitOrderEvent(event: OrderEvent): void {
    this.orderEvents$.next(event);
  }

  emitChatEvent(event: ChatEvent): void {
    this.chatEvents$.next(event);
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

  // Чат для админов — все сообщения
  getChatEvents(): Observable<ChatEvent> {
    return this.chatEvents$.asObservable();
  }

  // Чат для клиентов — только их сообщения
  getChatEventsForUser(userId: string): Observable<ChatEvent> {
    return this.chatEvents$.asObservable().pipe(
      filter((event) => event.userId === userId),
    );
  }
}
