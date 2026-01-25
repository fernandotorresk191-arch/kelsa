'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { adminPurchasesApi } from '@/features/admin/api';
import { Purchase, Batch } from '@/features/admin/types';
import { Button } from '@/components/ui/button';

export default function PurchaseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBatches, setSelectedBatches] = useState<Set<string>>(new Set());

  const fetchPurchase = async () => {
    try {
      setIsLoading(true);
      const data = await adminPurchasesApi.getPurchase(params.id as string);
      setPurchase(data);
    } catch (error) {
      console.error('Failed to fetch purchase:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (params.id) {
      fetchPurchase();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const formatPrice = (kopecks: number) => {
    return (kopecks / 100).toFixed(2) + ' ₽';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU');
  };

  const toggleBatchSelection = (batchId: string) => {
    const newSelected = new Set(selectedBatches);
    if (newSelected.has(batchId)) {
      newSelected.delete(batchId);
    } else {
      newSelected.add(batchId);
    }
    setSelectedBatches(newSelected);
  };

  const selectAllBatches = () => {
    if (purchase) {
      if (selectedBatches.size === purchase.batches.length) {
        setSelectedBatches(new Set());
      } else {
        setSelectedBatches(new Set(purchase.batches.map(b => b.id)));
      }
    }
  };

  const handlePrintLabels = () => {
    if (selectedBatches.size === 0) {
      alert('Выберите хотя бы одну партию для печати');
      return;
    }

    const batchesToPrint = purchase?.batches.filter(b => selectedBatches.has(b.id)) || [];
    const labelsHTML = generateLabelsHTML(batchesToPrint);

    // Открываем новое окно для печати
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(labelsHTML);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 500);
    }
  };

  const handlePrintSingleLabel = (batch: Batch) => {
    const labelsHTML = generateLabelsHTML([batch]);
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(labelsHTML);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 500);
    }
  };

  const generateLabelsHTML = (batches: Batch[]) => {
    const labelsHTML = batches.map(batch => `
      <div class="label">
        <div class="batch-code">${batch.batchCode}</div>
        <div class="product-name">${batch.product?.title || 'Товар'}</div>
        <div class="details">
          <span class="cell">📍 ${batch.cellNumber}</span>
          ${batch.expiryDate ? `<span class="expiry">⏰ ${formatDate(batch.expiryDate)}</span>` : ''}
        </div>
        <div class="qty">Кол-во: ${batch.quantity} шт.</div>
      </div>
    `).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Этикетки партий</title>
        <style>
          @page { 
            size: 60mm 40mm; 
            margin: 2mm;
          }
          body { 
            margin: 0; 
            padding: 0; 
            font-family: Arial, sans-serif;
          }
          .label {
            width: 56mm;
            height: 36mm;
            border: 1px solid #333;
            padding: 3mm;
            page-break-after: always;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }
          .label:last-child {
            page-break-after: auto;
          }
          .batch-code {
            font-size: 14pt;
            font-weight: bold;
            font-family: monospace;
            text-align: center;
            background: #f0f0f0;
            padding: 2mm;
            border-radius: 2mm;
          }
          .product-name {
            font-size: 9pt;
            text-align: center;
            margin: 2mm 0;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          .details {
            display: flex;
            justify-content: space-between;
            font-size: 8pt;
          }
          .cell {
            font-weight: bold;
          }
          .expiry {
            color: #c00;
          }
          .qty {
            font-size: 10pt;
            font-weight: bold;
            text-align: center;
          }
          @media print {
            body { -webkit-print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        ${labelsHTML}
      </body>
      </html>
    `;
  };

  const handleDeletePurchase = async () => {
    if (!purchase) return;
    if (!confirm('Вы уверены, что хотите удалить эту закупку? Остатки товаров будут уменьшены.')) {
      return;
    }

    try {
      await adminPurchasesApi.deletePurchase(purchase.id);
      router.push('/admin/purchases');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Ошибка при удалении закупки';
      alert(message);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Загрузка...</div>
      </div>
    );
  }

  if (!purchase) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="text-gray-500">Закупка не найдена</div>
        <Link href="/admin/purchases" className="text-blue-600 hover:underline">
          ← Вернуться к списку закупок
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex justify-between items-start">
        <div>
          <Link
            href="/admin/purchases"
            className="text-blue-600 hover:underline text-sm"
          >
            ← Назад к списку закупок
          </Link>
          <h1 className="text-2xl font-bold mt-2">
            Закупка #{String(purchase.purchaseNumber).padStart(5, '0')}
          </h1>
          <p className="text-gray-500">
            от {formatDate(purchase.createdAt)}
            {purchase.supplierName && ` • Поставщик: ${purchase.supplierName}`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handlePrintLabels}
            disabled={selectedBatches.size === 0}
          >
            🏷️ Печать этикеток ({selectedBatches.size})
          </Button>
          <Button
            variant="destructive"
            onClick={handleDeletePurchase}
          >
            Удалить
          </Button>
        </div>
      </div>

      {/* Информация о закупке */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-4 gap-6">
          <div>
            <div className="text-sm text-gray-500">Номер закупки</div>
            <div className="text-lg font-mono font-bold">
              #{String(purchase.purchaseNumber).padStart(5, '0')}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Позиций</div>
            <div className="text-lg font-bold">{purchase.batches.length}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Общее количество</div>
            <div className="text-lg font-bold">
              {purchase.batches.reduce((sum, b) => sum + b.quantity, 0)} шт.
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Общая сумма</div>
            <div className="text-lg font-bold text-green-600">
              {formatPrice(purchase.totalAmount)}
            </div>
          </div>
        </div>
        {purchase.notes && (
          <div className="mt-4 pt-4 border-t">
            <div className="text-sm text-gray-500">Примечания</div>
            <div>{purchase.notes}</div>
          </div>
        )}
      </div>

      {/* Партии */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <h2 className="text-lg font-semibold">Партии товаров</h2>
          <Button variant="outline" size="sm" onClick={selectAllBatches}>
            {selectedBatches.size === purchase.batches.length ? 'Снять выбор' : 'Выбрать все'}
          </Button>
        </div>
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-3 text-center w-12">
                <input
                  type="checkbox"
                  title="Выбрать все партии"
                  checked={selectedBatches.size === purchase.batches.length}
                  onChange={selectAllBatches}
                  className="w-4 h-4"
                />
              </th>
              <th className="px-4 py-3 text-left">Код партии</th>
              <th className="px-4 py-3 text-left">Товар</th>
              <th className="px-4 py-3 text-center">Ячейка</th>
              <th className="px-4 py-3 text-center">Кол-во</th>
              <th className="px-4 py-3 text-center">Остаток</th>
              <th className="px-4 py-3 text-right">Цена за шт.</th>
              <th className="px-4 py-3 text-center">Срок годности</th>
              <th className="px-4 py-3 text-center">Статус</th>
              <th className="px-4 py-3 text-center">Этикетка</th>
            </tr>
          </thead>
          <tbody>
            {purchase.batches.map((batch) => {
              const isExpiringSoon = batch.expiryDate && 
                new Date(batch.expiryDate) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
              const isExpired = batch.expiryDate && 
                new Date(batch.expiryDate) < new Date();

              return (
                <tr key={batch.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      title="Выбрать партию"
                      checked={selectedBatches.has(batch.id)}
                      onChange={() => toggleBatchSelection(batch.id)}
                      className="w-4 h-4"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono font-bold bg-gray-100 px-2 py-1 rounded">
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
                  <td className="px-4 py-3 text-center">{batch.quantity}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={batch.remainingQty === 0 ? 'text-red-600' : 'text-green-600'}>
                      {batch.remainingQty}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">{formatPrice(batch.purchasePrice)}</td>
                  <td className={`px-4 py-3 text-center ${isExpired ? 'text-red-600 font-bold' : isExpiringSoon ? 'text-orange-600' : ''}`}>
                    {batch.expiryDate ? formatDate(batch.expiryDate) : '—'}
                    {isExpired && ' ⚠️'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 rounded text-xs ${
                      batch.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                      batch.status === 'EXPIRED' ? 'bg-red-100 text-red-800' :
                      batch.status === 'SOLD_OUT' ? 'bg-gray-100 text-gray-800' :
                      'bg-orange-100 text-orange-800'
                    }`}>
                      {batch.status === 'ACTIVE' ? 'Активна' :
                       batch.status === 'EXPIRED' ? 'Просрочена' :
                       batch.status === 'SOLD_OUT' ? 'Продана' :
                       'Списана'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handlePrintSingleLabel(batch)}
                      className="text-blue-600 hover:text-blue-800"
                      title="Печать этикетки"
                    >
                      🏷️
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
