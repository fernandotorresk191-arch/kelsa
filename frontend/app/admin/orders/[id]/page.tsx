'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { adminOrdersApi } from '@/features/admin/api';
import { Order, OrderStatus, OrderStatusLabels, OrderStatusColors } from '@/features/admin/types';
import { useOrdersSSE } from '@/features/admin/useOrdersSSE';
import AdminChatPanel from '@/components/admin/AdminChatPanel';

interface AvailableCourier {
  id: string;
  fullName: string;
  phone: string;
  carBrand?: string;
  carNumber?: string;
  status: string;
  activeOrdersCount: number;
}

export default function AdminOrderDetailPage() {
  const router = useRouter();
  const [orderId, setOrderId] = useState<string | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [newStatus, setNewStatus] = useState<OrderStatus | ''>('');
  const [comment, setComment] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Состояние для назначения курьера
  const [showCourierModal, setShowCourierModal] = useState(false);
  const [availableCouriers, setAvailableCouriers] = useState<AvailableCourier[]>([]);
  const [loadingCouriers, setLoadingCouriers] = useState(false);
  const [assigningCourier, setAssigningCourier] = useState(false);

  useEffect(() => {
    const pathParts = window.location.pathname.split('/');
    const id = pathParts[pathParts.length - 1];
    setOrderId(id);
  }, []);

  // SSE для live обновлений статуса заказа
  const handleOrderUpdated = useCallback((orderData: { id: string; status: string }) => {
    if (orderId && orderData.id === orderId) {
      // Перезагружаем заказ для получения полных данных
      adminOrdersApi.getOrder(orderId).then((data) => {
        setOrder(data as Order);
        setNewStatus(data.status);
      }).catch(console.error);
    }
  }, [orderId]);

  useOrdersSSE({
    onOrderUpdated: handleOrderUpdated,
    enabled: !!orderId,
    playSound: false,
  });

  useEffect(() => {
    if (!orderId) return;
    const fetchOrder = async () => {
      try {
        setIsLoading(true);
        const data = await adminOrdersApi.getOrder(orderId);
        setOrder(data as Order);
        setNewStatus(data.status);
      } catch (error) {
        console.error('Failed to fetch order:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrder();
  }, [orderId]);

  const handleStatusUpdate = async () => {
    if (!newStatus || !order || !orderId) return;

    try {
      setIsUpdating(true);
      await adminOrdersApi.updateOrderStatus(orderId, newStatus, comment);
      // Перезагружаем заказ
      const updated = await adminOrdersApi.getOrder(orderId);
      setOrder(updated as Order);
      setComment('');
    } catch (error) {
      console.error('Failed to update order status:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePrint = async () => {
    if (!orderId) return;
    try {
      const invoiceData = await adminOrdersApi.getInvoice(orderId);
      const printData = invoiceData as { html: string; fileName: string };
      const printWindow = window.open('', '', 'height=600,width=800');
      if (printWindow) {
        printWindow.document.write(printData.html);
        printWindow.document.close();
        printWindow.print();
      }
    } catch (error) {
      console.error('Failed to print invoice:', error);
    }
  };

  const handlePrintPicking = async () => {
    if (!orderId) return;
    try {
      const pickingData = await adminOrdersApi.getPickingList(orderId);
      const printData = pickingData as { html: string; fileName: string };
      const printWindow = window.open('', '', 'height=600,width=800');
      if (printWindow) {
        printWindow.document.write(printData.html);
        printWindow.document.close();
        printWindow.print();
      }
    } catch (error) {
      console.error('Failed to print picking list:', error);
    }
  };

  // Загрузка доступных курьеров
  const loadAvailableCouriers = useCallback(async () => {
    try {
      setLoadingCouriers(true);
      const response = await adminOrdersApi.getAvailableCouriers();
      setAvailableCouriers(response.data);
    } catch (error) {
      console.error('Failed to load couriers:', error);
    } finally {
      setLoadingCouriers(false);
    }
  }, []);

  // Открыть модальное окно назначения курьера
  const handleOpenCourierModal = () => {
    setShowCourierModal(true);
    loadAvailableCouriers();
  };

  // Назначить курьера
  const handleAssignCourier = async (courierId: string) => {
    if (!orderId) return;
    
    try {
      setAssigningCourier(true);
      await adminOrdersApi.assignCourier(orderId, courierId);
      // Перезагружаем заказ
      const updated = await adminOrdersApi.getOrder(orderId);
      setOrder(updated as Order);
      setNewStatus(updated.status);
      setShowCourierModal(false);
    } catch (error) {
      console.error('Failed to assign courier:', error);
      alert('Ошибка при назначении курьера');
    } finally {
      setAssigningCourier(false);
    }
  };

  if (isLoading) {
    return <div className="p-6 text-center">Загрузка...</div>;
  }

  if (!order) {
    return <div className="p-6 text-center text-red-600">Заказ не найден</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Заказ #{order.orderNumber}</h1>
        <button
          onClick={() => router.back()}
          className="text-gray-600 hover:text-gray-900"
        >
          ← Назад
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Основная информация */}
        <div className="lg:col-span-2 space-y-6">
          {/* Информация о клиенте */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-bold mb-4">Информация о заказе</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-gray-600 text-sm">Клиент</p>
                <p className="text-gray-900 font-medium">{order.customerName}</p>
              </div>
              <div>
                <p className="text-gray-600 text-sm">Телефон</p>
                <p className="text-gray-900 font-medium">{order.phone}</p>
              </div>
              <div>
                <p className="text-gray-600 text-sm">Адрес доставки</p>
                <p className="text-gray-900 font-medium">{order.addressLine}</p>
              </div>
              <div>
                <p className="text-gray-600 text-sm">Дата заказа</p>
                <p className="text-gray-900 font-medium">
                  {new Date(order.createdAt).toLocaleString('ru-RU')}
                </p>
              </div>
            </div>
            {order.comment && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                <p className="text-gray-600 text-sm">Комментарий клиента</p>
                <p className="text-gray-900">{order.comment}</p>
              </div>
            )}
          </div>

          {/* Товары в заказе */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-bold mb-4">Товары в заказе</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-2 text-left text-gray-600 font-medium">Товар</th>
                    <th className="px-4 py-2 text-right text-gray-600 font-medium">Цена</th>
                    <th className="px-4 py-2 text-right text-gray-600 font-medium">Кол-во</th>
                    <th className="px-4 py-2 text-right text-gray-600 font-medium">Сумма</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {order.items.map((item: { id: string; title: string; price: number; qty: number; amount: number }) => (
                    <tr key={item.id}>
                      <td className="px-4 py-2 text-gray-900 font-medium">{item.title}</td>
                      <td className="px-4 py-2 text-right text-gray-600">
                        {item.price.toLocaleString('ru-RU')} ₽
                      </td>
                      <td className="px-4 py-2 text-right text-gray-600">{item.qty}</td>
                      <td className="px-4 py-2 text-right text-gray-900 font-medium">
                        {item.amount.toLocaleString('ru-RU')} ₽
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t-2 border-gray-300">
                  <tr className="font-bold">
                    <td colSpan={3} className="px-4 py-2 text-right">
                      Итого:
                    </td>
                    <td className="px-4 py-2 text-right">
                      {order.totalAmount.toLocaleString('ru-RU')} ₽
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Экономика заказа */}
          {(order.purchaseCost !== undefined || order.courierCost !== undefined || order.profit !== undefined) && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold mb-4">Экономика заказа</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="text-sm text-blue-600">Выручка</div>
                  <div className="text-xl font-bold text-blue-800">
                    {order.totalAmount.toLocaleString('ru-RU')} ₽
                  </div>
                </div>
                <div className="p-3 bg-orange-50 rounded-lg">
                  <div className="text-sm text-orange-600">Себестоимость</div>
                  <div className="text-xl font-bold text-orange-800">
                    {(order.purchaseCost ?? 0).toLocaleString('ru-RU')} ₽
                  </div>
                </div>
                <div className="p-3 bg-purple-50 rounded-lg">
                  <div className="text-sm text-purple-600">Доставка курьеру</div>
                  <div className="text-xl font-bold text-purple-800">
                    {(order.courierCost ?? 0).toLocaleString('ru-RU')} ₽
                  </div>
                </div>
                <div className={`p-3 rounded-lg ${(order.profit ?? 0) >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                  <div className={`text-sm ${(order.profit ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>Прибыль</div>
                  <div className={`text-xl font-bold ${(order.profit ?? 0) >= 0 ? 'text-green-800' : 'text-red-800'}`}>
                    {(order.profit ?? 0).toLocaleString('ru-RU')} ₽
                  </div>
                </div>
              </div>
              {order.settlement && (
                <div className="mt-3 text-sm text-slate-500">
                  Населённый пункт: <span className="font-medium text-slate-700">{order.settlement}</span>
                </div>
              )}
            </div>
          )}

          {/* Чат с клиентом */}
          <AdminChatPanel orderId={order.id} orderNumber={order.orderNumber} />

          {/* История статусов */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-bold mb-4">История статусов</h2>
            <div className="space-y-3">
              {order.statusHistory && order.statusHistory.length > 0 ? (
                order.statusHistory.map((history: { id: string; status: string; createdAt: string; comment?: string; changedBy?: string }) => (
                  <div
                    key={history.id}
                    className="flex items-start gap-4 p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`admin-badge px-2 py-1 text-xs ${OrderStatusColors[history.status as OrderStatus]}`}>
                          {OrderStatusLabels[history.status as OrderStatus]}
                        </span>
                        {history.changedBy && (
                          <span className="text-xs text-gray-500">
                            • {history.changedBy}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 mt-1">
                        {new Date(history.createdAt).toLocaleString('ru-RU')}
                      </p>
                      {history.comment && (
                        <p className="text-sm text-gray-700 mt-2 bg-gray-100 p-2 rounded">{history.comment}</p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-sm">История статусов пока недоступна</p>
              )}
            </div>
          </div>
        </div>

        {/* Сайдбар с управлением статусом */}
        <div className="space-y-6">
          {/* Текущий статус */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-bold text-gray-900 mb-3">Текущий статус</h3>
            <div
              className={`px-4 py-3 rounded-lg text-center font-medium ${
                OrderStatusColors[order.status as OrderStatus]
              }`}
            >
              {OrderStatusLabels[order.status as OrderStatus]}
            </div>

            {/* Изменение статуса */}
            <div className="mt-6">
              <label htmlFor="new-status" className="block text-sm font-medium text-gray-700 mb-2">
                Новый статус
              </label>
              <select
                id="new-status"
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as OrderStatus)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-3"
              >
                {Object.entries(OrderStatusLabels).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label as React.ReactNode}
                  </option>
                ))}
              </select>

              <label htmlFor="new-comment" className="block text-sm font-medium text-gray-700 mb-2">
                Комментарий (опционально)
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Например: товар отправлен с курьером"
                className="admin-input mb-3 text-sm"
                rows={3}
              />

              <button
                onClick={handleStatusUpdate}
                disabled={isUpdating || newStatus === order.status}
                className="w-full admin-btn admin-btn-primary"
              >
                {isUpdating ? 'Обновление...' : 'Обновить статус'}
              </button>
            </div>

            {/* Печать */}
            <button
              onClick={handlePrint}
              className="w-full mt-3 admin-btn admin-btn-success flex items-center justify-center gap-2"
            >
              🖨️ Печать накладной
            </button>
            <button
              onClick={handlePrintPicking}
              className="w-full mt-2 admin-btn admin-btn-warning flex items-center justify-center gap-2"
            >
              📦 Накладная сбора
            </button>

            {/* Кнопка передать курьеру - только для статуса ASSEMBLING */}
            {order.status === OrderStatus.ASSEMBLING && (
              <button
                onClick={handleOpenCourierModal}
                className="w-full mt-4 admin-btn flex items-center justify-center gap-2"
                style={{ 
                  background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                  color: 'white',
                }}
              >
                🚚 Передать курьеру
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Модальное окно выбора курьера */}
      {showCourierModal && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowCourierModal(false)}
        >
          <div 
            className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900">Выберите курьера</h3>
              <button 
                onClick={() => setShowCourierModal(false)}
                className="text-gray-400 hover:text-gray-600 text-xl"
              >
                ✕
              </button>
            </div>

            <div className="p-4 overflow-y-auto max-h-[60vh]">
              {loadingCouriers ? (
                <div className="text-center py-8">
                  <div className="admin-spinner mx-auto" />
                  <p className="text-gray-500 mt-2">Загрузка курьеров...</p>
                </div>
              ) : availableCouriers.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-4xl mb-2">😔</p>
                  <p className="text-gray-600 font-medium">Нет доступных курьеров</p>
                  <p className="text-gray-400 text-sm">Все курьеры сейчас на доставке</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {availableCouriers.map((courier) => (
                    <button
                      key={courier.id}
                      onClick={() => handleAssignCourier(courier.id)}
                      disabled={assigningCourier}
                      className="w-full p-4 bg-gray-50 hover:bg-indigo-50 rounded-lg border border-gray-200 hover:border-indigo-300 transition-all text-left"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-gray-900">{courier.fullName}</p>
                          <p className="text-sm text-gray-500">{courier.phone}</p>
                          {courier.carBrand && (
                            <p className="text-xs text-gray-400 mt-1">
                              🚗 {courier.carBrand} {courier.carNumber && `(${courier.carNumber})`}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                            courier.status === 'AVAILABLE' 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {courier.status === 'AVAILABLE' ? 'Свободен' : 'Взял заказ'}
                          </span>
                          {courier.activeOrdersCount > 0 && (
                            <p className="text-xs text-gray-400 mt-1">
                              {courier.activeOrdersCount} заказ{courier.activeOrdersCount === 1 ? '' : 'а'}
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
