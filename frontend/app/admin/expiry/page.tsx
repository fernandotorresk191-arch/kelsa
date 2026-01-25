'use client';

import { useEffect, useState } from 'react';
import { adminExpiryApi } from '@/features/admin/api';
import { Batch, WriteOff, ExpiryStats } from '@/features/admin/types';
import { Button } from '@/components/ui/button';

type TabType = 'expiring' | 'expired' | 'history';

export default function AdminExpiryPage() {
  const [activeTab, setActiveTab] = useState<TabType>('expiring');
  const [expiringBatches, setExpiringBatches] = useState<Batch[]>([]);
  const [expiredBatches, setExpiredBatches] = useState<Batch[]>([]);
  const [writeOffs, setWriteOffs] = useState<WriteOff[]>([]);
  const [stats, setStats] = useState<ExpiryStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [daysThreshold, setDaysThreshold] = useState(7);

  // Модалка списания
  const [showWriteOffModal, setShowWriteOffModal] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [writeOffQuantity, setWriteOffQuantity] = useState(0);
  const [writeOffReason, setWriteOffReason] = useState('Просрочка');

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [expiringRes, expiredRes, writeOffsRes, statsRes] = await Promise.all([
        adminExpiryApi.getExpiringBatches(daysThreshold),
        adminExpiryApi.getExpiredBatches(),
        adminExpiryApi.getWriteOffs(),
        adminExpiryApi.getStats(),
      ]);
      setExpiringBatches(expiringRes.data);
      setExpiredBatches(expiredRes.data);
      setWriteOffs(writeOffsRes.data);
      setStats(statsRes);
    } catch (error) {
      console.error('Failed to fetch expiry data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [daysThreshold]);

  const formatPrice = (kopecks: number) => {
    return (kopecks / 100).toFixed(2) + ' ₽';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU');
  };

  const getDaysUntilExpiry = (expiryDate: string) => {
    const expiry = new Date(expiryDate);
    const today = new Date();
    const diff = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const openWriteOffModal = (batch: Batch) => {
    setSelectedBatch(batch);
    setWriteOffQuantity(batch.remainingQty);
    setWriteOffReason('Просрочка');
    setShowWriteOffModal(true);
  };

  const handleWriteOff = async () => {
    if (!selectedBatch) return;
    if (writeOffQuantity <= 0 || writeOffQuantity > selectedBatch.remainingQty) {
      alert('Укажите корректное количество');
      return;
    }

    try {
      await adminExpiryApi.writeOff(selectedBatch.id, writeOffQuantity, writeOffReason);
      setShowWriteOffModal(false);
      setSelectedBatch(null);
      fetchData();
    } catch (error) {
      console.error('Failed to write off:', error);
      alert('Ошибка при списании');
    }
  };

  const handleWriteOffAll = async (batch: Batch) => {
    if (!confirm(`Списать всю партию "${batch.product?.title}" (${batch.remainingQty} шт.)?`)) {
      return;
    }

    try {
      await adminExpiryApi.writeOffBatch(batch.id, 'Просрочка');
      fetchData();
    } catch (error) {
      console.error('Failed to write off batch:', error);
      alert('Ошибка при списании');
    }
  };

  const renderBatchesTable = (batches: Batch[], showDaysColumn = false) => (
    <table className="w-full">
      <thead className="bg-gray-100">
        <tr>
          <th className="px-4 py-3 text-left">Код партии</th>
          <th className="px-4 py-3 text-left">Товар</th>
          <th className="px-4 py-3 text-center">Ячейка</th>
          <th className="px-4 py-3 text-center">Остаток</th>
          <th className="px-4 py-3 text-center">Срок годности</th>
          {showDaysColumn && <th className="px-4 py-3 text-center">Дней</th>}
          <th className="px-4 py-3 text-right">Стоимость</th>
          <th className="px-4 py-3 text-center">Действия</th>
        </tr>
      </thead>
      <tbody>
        {batches.length === 0 ? (
          <tr>
            <td colSpan={showDaysColumn ? 8 : 7} className="px-4 py-8 text-center text-gray-500">
              Нет данных
            </td>
          </tr>
        ) : (
          batches.map((batch) => {
            const daysLeft = batch.expiryDate ? getDaysUntilExpiry(batch.expiryDate) : null;
            const value = batch.remainingQty * batch.purchasePrice;

            return (
              <tr key={batch.id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-3">
                  <span className="font-mono font-bold bg-blue-100 px-2 py-1 rounded">
                    {batch.batchCode}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium">{batch.product?.title}</div>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="font-mono bg-yellow-100 px-2 py-1 rounded">
                    {batch.cellNumber}
                  </span>
                </td>
                <td className="px-4 py-3 text-center font-bold">{batch.remainingQty}</td>
                <td className="px-4 py-3 text-center">
                  {batch.expiryDate ? formatDate(batch.expiryDate) : '—'}
                </td>
                {showDaysColumn && (
                  <td className={`px-4 py-3 text-center font-bold ${
                    daysLeft !== null && daysLeft <= 3 ? 'text-red-600' :
                    daysLeft !== null && daysLeft <= 7 ? 'text-orange-600' :
                    'text-gray-600'
                  }`}>
                    {daysLeft !== null ? (daysLeft <= 0 ? '⚠️ Просрочен' : `${daysLeft} дн.`) : '—'}
                  </td>
                )}
                <td className="px-4 py-3 text-right">
                  {formatPrice(value)}
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="flex gap-2 justify-center">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openWriteOffModal(batch)}
                    >
                      Списать
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleWriteOffAll(batch)}
                    >
                      Списать всё
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })
        )}
      </tbody>
    </table>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Просрочка</h1>
        <p className="text-gray-500">Контроль сроков годности и списание товаров</p>
      </div>

      {/* Статистика */}
      {stats && (
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
            <div className="text-orange-600 text-sm font-medium">Истекает через 7 дней</div>
            <div className="text-2xl font-bold text-orange-700">{stats.expiringBatches}</div>
            <div className="text-sm text-orange-600">партий</div>
          </div>
          <div className="bg-red-50 rounded-lg p-4 border border-red-200">
            <div className="text-red-600 text-sm font-medium">Просрочено</div>
            <div className="text-2xl font-bold text-red-700">{stats.expiredBatches}</div>
            <div className="text-sm text-red-600">партий</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="text-gray-600 text-sm font-medium">Всего списано</div>
            <div className="text-2xl font-bold">{stats.totalQuantity}</div>
            <div className="text-sm text-gray-600">единиц</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="text-gray-600 text-sm font-medium">Потери</div>
            <div className="text-2xl font-bold text-red-600">{formatPrice(stats.totalValue)}</div>
            <div className="text-sm text-gray-600">всего</div>
          </div>
        </div>
      )}

      {/* Табы */}
      <div className="border-b">
        <nav className="flex gap-4">
          <button
            className={`px-4 py-2 border-b-2 ${
              activeTab === 'expiring'
                ? 'border-orange-500 text-orange-600 font-medium'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('expiring')}
          >
            ⏰ Истекает скоро ({expiringBatches.length})
          </button>
          <button
            className={`px-4 py-2 border-b-2 ${
              activeTab === 'expired'
                ? 'border-red-500 text-red-600 font-medium'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('expired')}
          >
            ⚠️ Просрочено ({expiredBatches.length})
          </button>
          <button
            className={`px-4 py-2 border-b-2 ${
              activeTab === 'history'
                ? 'border-gray-500 text-gray-600 font-medium'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('history')}
          >
            📋 История списаний
          </button>
        </nav>
      </div>

      {/* Контент таба */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Загрузка...</div>
        ) : activeTab === 'expiring' ? (
          <div>
            <div className="px-4 py-3 border-b flex justify-between items-center">
              <h2 className="font-medium">
                Товары со сроком годности в ближайшие {daysThreshold} дней
              </h2>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Показать за:</span>
                <select
                  title="Выберите период"
                  className="border rounded px-2 py-1"
                  value={daysThreshold}
                  onChange={(e) => setDaysThreshold(parseInt(e.target.value))}
                >
                  <option value={3}>3 дня</option>
                  <option value={7}>7 дней</option>
                  <option value={14}>14 дней</option>
                  <option value={30}>30 дней</option>
                </select>
              </div>
            </div>
            {renderBatchesTable(expiringBatches, true)}
          </div>
        ) : activeTab === 'expired' ? (
          <div>
            <div className="px-4 py-3 border-b bg-red-50">
              <h2 className="font-medium text-red-700">
                ⚠️ Просроченные товары требуют списания
              </h2>
            </div>
            {renderBatchesTable(expiredBatches)}
          </div>
        ) : (
          <div>
            <div className="px-4 py-3 border-b">
              <h2 className="font-medium">История списаний</h2>
            </div>
            <table className="w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left">Дата</th>
                  <th className="px-4 py-3 text-left">Код партии</th>
                  <th className="px-4 py-3 text-left">Товар</th>
                  <th className="px-4 py-3 text-center">Кол-во</th>
                  <th className="px-4 py-3 text-left">Причина</th>
                  <th className="px-4 py-3 text-right">Потери</th>
                </tr>
              </thead>
              <tbody>
                {writeOffs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                      Нет списаний
                    </td>
                  </tr>
                ) : (
                  writeOffs.map((wo) => (
                    <tr key={wo.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3">{formatDate(wo.createdAt)}</td>
                      <td className="px-4 py-3">
                        <span className="font-mono bg-gray-100 px-2 py-1 rounded">
                          {wo.batch?.batchCode}
                        </span>
                      </td>
                      <td className="px-4 py-3">{wo.batch?.product?.title}</td>
                      <td className="px-4 py-3 text-center font-bold">{wo.quantity}</td>
                      <td className="px-4 py-3">{wo.reason}</td>
                      <td className="px-4 py-3 text-right text-red-600 font-medium">
                        {formatPrice(wo.quantity * (wo.batch?.purchasePrice || 0))}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Модалка списания */}
      {showWriteOffModal && selectedBatch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Списание товара</h3>
            
            <div className="space-y-4">
              <div>
                <div className="text-sm text-gray-500">Партия</div>
                <div className="font-mono font-bold">{selectedBatch.batchCode}</div>
              </div>

              <div>
                <div className="text-sm text-gray-500">Товар</div>
                <div>{selectedBatch.product?.title}</div>
              </div>

              <div>
                <div className="text-sm text-gray-500">Доступно для списания</div>
                <div className="font-bold">{selectedBatch.remainingQty} шт.</div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Количество для списания
                </label>
                <input
                  type="number"
                  title="Количество для списания"
                  min={1}
                  max={selectedBatch.remainingQty}
                  value={writeOffQuantity}
                  onChange={(e) => setWriteOffQuantity(parseInt(e.target.value) || 0)}
                  className="w-full border rounded px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Причина списания
                </label>
                <select
                  title="Выберите причину списания"
                  value={writeOffReason}
                  onChange={(e) => setWriteOffReason(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="Просрочка">Просрочка</option>
                  <option value="Брак">Брак</option>
                  <option value="Порча">Порча</option>
                  <option value="Другое">Другое</option>
                </select>
              </div>

              <div className="bg-red-50 p-3 rounded">
                <div className="text-sm text-red-700">Потери:</div>
                <div className="text-lg font-bold text-red-700">
                  {formatPrice(writeOffQuantity * selectedBatch.purchasePrice)}
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowWriteOffModal(false)}
              >
                Отмена
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={handleWriteOff}
              >
                Списать
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
