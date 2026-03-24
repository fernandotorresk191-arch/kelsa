// ==================== COURIER TYPES ====================

export type CourierStatus = 'OFF_DUTY' | 'AVAILABLE' | 'ACCEPTED' | 'DELIVERING';

export const CourierStatusLabels: Record<CourierStatus, string> = {
  OFF_DUTY: 'Не работаю',
  AVAILABLE: 'Свободен',
  ACCEPTED: 'Взял заказ',
  DELIVERING: 'В доставке',
};

export type Courier = {
  id: string;
  fullName: string;
  login: string;
  phone: string;
  carBrand?: string;
  carNumber?: string;
  status: CourierStatus;
  isActive: boolean;
};

export enum CourierOrderStatus {
  ASSIGNED_TO_COURIER = 'ASSIGNED_TO_COURIER',
  ACCEPTED_BY_COURIER = 'ACCEPTED_BY_COURIER',
  ON_THE_WAY = 'ON_THE_WAY',
  DELIVERED = 'DELIVERED',
  CANCELED = 'CANCELED',
}

export const CourierOrderStatusLabels: Record<string, string> = {
  ASSIGNED_TO_COURIER: 'Назначен',
  ACCEPTED_BY_COURIER: 'Принят',
  ON_THE_WAY: 'В пути',
  DELIVERED: 'Доставлен',
  CANCELED: 'Отменён',
};

export const CourierOrderStatusColors: Record<string, string> = {
  ASSIGNED_TO_COURIER: 'bg-yellow-100 text-yellow-800',
  ACCEPTED_BY_COURIER: 'bg-blue-100 text-blue-800',
  ON_THE_WAY: 'bg-purple-100 text-purple-800',
  DELIVERED: 'bg-green-100 text-green-800',
  CANCELED: 'bg-red-100 text-red-800',
};

export type CourierOrderItem = {
  id: string;
  title: string;
  qty: number;
  price: number;
  amount: number;
  product: {
    id: string;
    title: string;
    imageUrl?: string;
  };
};

export type CourierOrder = {
  id: string;
  orderNumber: number;
  status: string;
  customerName: string;
  phone: string;
  addressLine: string;
  comment?: string;
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
  items: CourierOrderItem[];
  user?: {
    id: string;
    name: string;
    phone: string;
  };
};

// Статистика курьера для профиля
export type CourierProfileStats = {
  totalDeliveries: number;
  deliveriesToday: number;
  deliveriesThisWeek: number;
  deliveriesThisMonth: number;
  earningsToday: number;
  earningsThisWeek: number;
  earningsThisMonth: number;
  totalEarnings: number;
};

export type CourierDeliveryHistory = {
  id: string;
  orderNumber: number;
  customerName: string;
  addressLine: string;
  totalAmount: number;
  deliveredAt: string;
  earnings: number;
};
