'use client';

import { useEffect, useState } from 'react';
import { adminExpiryApi } from '@/features/admin/api';
import { Batch, WriteOff, ExpiryStats } from '@/features/admin/types';


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
    <table className="admin-table">
      <thead>
        <tr>
          <th>Код партии</th>
          <th>Товар</th>
          <th className="text-center">Ячейка</th>
          <th className="text-center">Остаток</th>
          <th className="text-center">Срок годности</th>
          {showDaysColumn && <th className="text-center">Дней</th>}
          <th className="text-right">Стоимость</th>
          <th className="admin-th-actions-lg">Действия</th>
        </tr>
      </thead>
      <tbody>
        {batches.length === 0 ? (
          <tr>
            <td colSpan={showDaysColumn ? 8 : 7} className="text-center py-12">
              <div className="admin-empty-state">
                <div className="admin-empty-icon">✓</div>
                <div className="admin-empty-title">Всё в порядке</div>
                <div className="admin-empty-text">Нет товаров с истекающим сроком</div>
              </div>
            </td>
          </tr>
        ) : (
          batches.map((batch) => {
            const daysLeft = batch.expiryDate ? getDaysUntilExpiry(batch.expiryDate) : null;
            const value = batch.remainingQty * batch.purchasePrice;

            return (
              <tr key={batch.id}>
                <td>
                  <span className="font-mono font-semibold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
                    {batch.batchCode}
                  </span>
                </td>
                <td className="font-medium">{batch.product?.title}</td>
                <td className="text-center">
                  <span className="font-mono text-amber-700 bg-amber-50 px-2 py-1 rounded">
                    {batch.cellNumber}
                  </span>
                </td>
                <td className="text-center font-semibold">{batch.remainingQty}</td>
                <td className="text-center text-slate-600">
                  {batch.expiryDate ? formatDate(batch.expiryDate) : '—'}
                </td>
                {showDaysColumn && (
                  <td className="text-center">
                    <span className={`admin-badge ${
                      daysLeft !== null && daysLeft <= 0 ? 'admin-badge-danger' :
                      daysLeft !== null && daysLeft <= 3 ? 'admin-badge-warning' :
                      'admin-badge-gray'
                    }`}>
                      {daysLeft !== null ? (daysLeft <= 0 ? 'Просрочен' : `${daysLeft} дн.`) : '—'}
                    </span>
                  </td>
                )}
                <td className="text-right font-medium text-slate-800">
                  {formatPrice(value)}
                </td>
                <td>
                  <div className="flex gap-2">
                    <button
                      className="admin-btn admin-btn-secondary admin-btn-sm"
                      onClick={() => openWriteOffModal(batch)}
                    >
                      Списать
                    </button>
                    <button
                      className="admin-btn admin-btn-danger admin-btn-sm"
                      onClick={() => handleWriteOffAll(batch)}
                    >
                      Всё
                    </button>
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
      {/* Page Header */}
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Просрочка</h1>
          <p className="admin-page-subtitle">Контроль сроков годности и списание товаров</p>
        </div>
      </div>

      {/* Статистика */}
      {stats && (
        <div className="grid grid-cols-4 gap-4">
          <div className="admin-kpi-card warning">
            <div className="flex items-center justify-between">
              <div>
                <p className="admin-kpi-label">Истекает через 7 дней</p>
                <p className="admin-kpi-value warning">{stats.expiringBatches}</p>
                <p className="text-sm text-slate-500 mt-1">партий</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center text-2xl">
                ⏰
              </div>
            </div>
          </div>
          <div className="admin-kpi-card danger">
            <div className="flex items-center justify-between">
              <div>
                <p className="admin-kpi-label">Просрочено</p>
                <p className="admin-kpi-value danger">{stats.expiredBatches}</p>
                <p className="text-sm text-slate-500 mt-1">партий</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center text-2xl">
                ⚠️
              </div>
            </div>
          </div>
          <div className="admin-kpi-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="admin-kpi-label">Всего списано</p>
                <p className="admin-kpi-value">{stats.totalQuantity}</p>
                <p className="text-sm text-slate-500 mt-1">единиц</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-2xl">
                📦
              </div>
            </div>
          </div>
          <div className="admin-kpi-card danger">
            <div className="flex items-center justify-between">
              <div>
                <p className="admin-kpi-label">Потери</p>
                <p className="admin-kpi-value danger">{formatPrice(stats.totalValue)}</p>
                <p className="text-sm text-slate-500 mt-1">всего</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center text-2xl">
                💸
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Табы */}
      <div className="admin-card overflow-hidden">
        <div className="border-b border-slate-200">
          <nav className="flex">
            <button
              className={`px-6 py-4 font-medium transition-colors border-b-2 ${
                activeTab === 'expiring'
                  ? 'border-amber-500 text-amber-600 bg-amber-50/50'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
              onClick={() => setActiveTab('expiring')}
            >
              <span className="mr-2">⏰</span>
              Истекает скоро
              <span className="ml-2 admin-badge admin-badge-warning">{expiringBatches.length}</span>
            </button>
            <button
              className={`px-6 py-4 font-medium transition-colors border-b-2 ${
                activeTab === 'expired'
                  ? 'border-red-500 text-red-600 bg-red-50/50'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
              onClick={() => setActiveTab('expired')}
            >
              <span className="mr-2">⚠️</span>
              Просрочено
              <span className="ml-2 admin-badge admin-badge-danger">{expiredBatches.length}</span>
            </button>
            <button
              className={`px-6 py-4 font-medium transition-colors border-b-2 ${
                activeTab === 'history'
                  ? 'border-slate-500 text-slate-700 bg-slate-50'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
              onClick={() => setActiveTab('history')}
            >
              <span className="mr-2">📋</span>
              История списаний
            </button>
          </nav>
        </div>

        {/* Контент таба */}
        {isLoading ? (
          <div className="admin-loading">
            <div className="admin-spinner" />
          </div>
        ) : activeTab === 'expiring' ? (
          <div>
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h2 className="font-medium text-slate-700">
                Товары со сроком годности в ближайшие {daysThreshold} дней
              </h2>
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-500">Показать за:</span>
                <select
                  title="Выберите период"
                  className="admin-input admin-select admin-select-sm"
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
            <div className="px-6 py-4 border-b border-red-200 bg-red-50">
              <h2 className="font-medium text-red-700 flex items-center gap-2">
                <span>⚠️</span>
                Просроченные товары требуют списания
              </h2>
            </div>
            {renderBatchesTable(expiredBatches)}
          </div>
        ) : (
          <div>
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
              <h2 className="font-medium text-slate-700">История списаний</h2>
            </div>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Дата</th>
                  <th>Код партии</th>
                  <th>Товар</th>
                  <th className="text-center">Кол-во</th>
                  <th>Причина</th>
                  <th className="text-right">Потери</th>
                </tr>
              </thead>
              <tbody>
                {writeOffs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12">
                      <div className="admin-empty-state">
                        <div className="admin-empty-icon">📋</div>
                        <div className="admin-empty-title">Нет списаний</div>
                        <div className="admin-empty-text">История пуста</div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  writeOffs.map((wo) => (
                    <tr key={wo.id}>
                      <td className="text-slate-600">{formatDate(wo.createdAt)}</td>
                      <td>
                        <span className="font-mono text-slate-600 bg-slate-100 px-2 py-1 rounded">
                          {wo.batch?.batchCode}
                        </span>
                      </td>
                      <td className="font-medium">{wo.batch?.product?.title}</td>
                      <td className="text-center">
                        <span className="admin-badge admin-badge-gray">{wo.quantity}</span>
                      </td>
                      <td className="text-slate-600">{wo.reason}</td>
                      <td className="text-right font-semibold text-red-600">
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md admin-fade-in">
            <div className="px-6 py-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-800">Списание товара</h3>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-slate-500 mb-1">Партия</div>
                  <div className="font-mono font-semibold text-indigo-600">{selectedBatch.batchCode}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-500 mb-1">Доступно</div>
                  <div className="font-semibold">{selectedBatch.remainingQty} шт.</div>
                </div>
              </div>

              <div>
                <div className="text-sm text-slate-500 mb-1">Товар</div>
                <div className="font-medium">{selectedBatch.product?.title}</div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Количество для списания
                </label>
                <input
                  type="number"
                  title="Количество для списания"
                  min={1}
                  max={selectedBatch.remainingQty}
                  value={writeOffQuantity}
                  onChange={(e) => setWriteOffQuantity(parseInt(e.target.value) || 0)}
                  className="admin-input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Причина списания
                </label>
                <select
                  title="Выберите причину списания"
                  value={writeOffReason}
                  onChange={(e) => setWriteOffReason(e.target.value)}
                  className="admin-input admin-select"
                >
                  <option value="Просрочка">Просрочка</option>
                  <option value="Брак">Брак</option>
                  <option value="Порча">Порча</option>
                  <option value="Другое">Другое</option>
                </select>
              </div>

              <div className="bg-red-50 border border-red-200 p-4 rounded-xl">
                <div className="text-sm text-red-600 mb-1">Потери от списания:</div>
                <div className="text-2xl font-bold text-red-700">
                  {formatPrice(writeOffQuantity * selectedBatch.purchasePrice)}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-200 flex gap-3">
              <button
                className="admin-btn admin-btn-secondary flex-1"
                onClick={() => setShowWriteOffModal(false)}
              >
                Отмена
              </button>
              <button
                className="admin-btn admin-btn-danger flex-1"
                onClick={handleWriteOff}
              >
                Списать
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
