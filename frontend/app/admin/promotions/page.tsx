'use client';

import { useEffect, useState } from 'react';
import { adminPromotionsApi, adminUploadApi } from '@/features/admin/api';
import { Promotion } from '@/features/admin/types';
import { ImageUpload } from '@/components/admin/ImageUpload';
import { resolveMediaUrl } from '@/shared/api/media';

export default function AdminPromotionsPage() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null);

  const fetchPromotions = async () => {
    try {
      setIsLoading(true);
      const response = await adminPromotionsApi.getPromotions(1, 100);
      setPromotions(response.data);
    } catch (error) {
      console.error('Failed to fetch promotions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPromotions();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Вы уверены?')) return;

    try {
      await adminPromotionsApi.deletePromotion(id);
      fetchPromotions();
    } catch (error) {
      console.error('Failed to delete promotion:', error);
    }
  };

  const handleEdit = (promotion: Promotion) => {
    setEditingPromotion(promotion);
    setShowForm(true);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingPromotion(null);
    fetchPromotions();
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingPromotion(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Управление баннерами</h1>
        <button
          onClick={() => {
            setEditingPromotion(null);
            setShowForm(!showForm);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          {showForm ? '✕ Отмена' : '+ Добавить баннер'}
        </button>
      </div>

      {/* Форма добавления/редактирования */}
      {showForm && (
        <PromotionForm
          promotion={editingPromotion}
          onSuccess={handleFormSuccess}
          onCancel={handleFormCancel}
        />
      )}

      {/* Таблица баннеров */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {isLoading ? (
          <div className="p-6 text-center">Загрузка...</div>
        ) : promotions.length === 0 ? (
          <div className="p-6 text-center text-gray-600">Баннеры не найдены</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                    Превью
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                    Название
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                    Ссылка
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase">
                    Порядок
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase">
                    Статус
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {promotions.map((promotion) => (
                  <tr key={promotion.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      {promotion.imageUrl && (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={resolveMediaUrl(promotion.imageUrl) || ''}
                          alt={promotion.title}
                          className="w-32 h-16 object-cover rounded"
                        />
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-medium text-gray-900">{promotion.title}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {promotion.url || '—'}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                        {promotion.sort}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {promotion.isActive ? (
                        <span className="text-xs font-medium text-green-600">✓ Активен</span>
                      ) : (
                        <span className="text-xs font-medium text-gray-400">○ Отключен</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(promotion)}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          Редактировать
                        </button>
                        <button
                          onClick={() => handleDelete(promotion.id)}
                          className="text-red-600 hover:text-red-800 font-medium"
                        >
                          Удалить
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function PromotionForm({
  promotion,
  onSuccess,
  onCancel,
}: {
  promotion: Promotion | null;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    title: promotion?.title || '',
    imageUrl: promotion?.imageUrl || '',
    url: promotion?.url || '',
    sort: promotion?.sort?.toString() || '0',
    isActive: promotion?.isActive ?? true,
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      setError('Название обязательно');
      return;
    }

    if (!promotion && !imageFile) {
      setError('Изображение обязательно');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const data = {
        title: formData.title,
        imageUrl: formData.imageUrl || 'temp.jpg', // временное значение для создания
        url: formData.url || undefined,
        sort: parseInt(formData.sort) || 0,
        isActive: formData.isActive,
      };

      if (promotion) {
        await adminPromotionsApi.updatePromotion(promotion.id, data);
      } else {
        // Создаем баннер с временным imageUrl
        const created = await adminPromotionsApi.createPromotion({
          ...data,
          url: data.url || null,
        });
        
        // Загружаем изображение для созданного баннера
        if (imageFile) {
          await adminUploadApi.uploadPromotionImage(created.id, imageFile);
        }
      }
      onSuccess();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Ошибка при сохранении баннера';
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formTitle = promotion ? 'Редактировать баннер' : 'Добавить новый баннер';

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-bold mb-4">{formTitle}</h2>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="promo-title" className="block text-sm font-medium text-gray-700 mb-1">
            Название *
          </label>
          <input
            id="promo-title"
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>

        {promotion ? (
          <ImageUpload
            label="Изображение баннера"
            currentImageUrl={formData.imageUrl || null}
            onUpload={async (file) => {
              const result = await adminUploadApi.uploadPromotionImage(promotion.id, file);
              setFormData(prev => ({ ...prev, imageUrl: result.imageUrl }));
              return result.imageUrl;
            }}
            onDelete={async () => {
              await adminUploadApi.deletePromotionImage(promotion.id);
              setFormData(prev => ({ ...prev, imageUrl: '' }));
            }}
            disabled={isSubmitting}
          />
        ) : (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Изображение баннера *
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
              {imageFile ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-16 rounded overflow-hidden bg-gray-100">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={URL.createObjectURL(imageFile)}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{imageFile.name}</p>
                        <p className="text-sm text-gray-500">
                          {(imageFile.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setImageFile(null)}
                      className="text-red-600 hover:text-red-800 font-medium text-sm"
                    >
                      Удалить
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) setImageFile(file);
                      }}
                      className="hidden"
                    />
                    <div className="space-y-2">
                      <div className="text-gray-400 text-4xl">📷</div>
                      <p className="text-sm text-gray-600">
                        Нажмите для выбора изображения
                      </p>
                      <p className="text-xs text-gray-500">
                        PNG, JPG до 5MB
                      </p>
                    </div>
                  </label>
                </div>
              )}
            </div>
          </div>
        )}

        <div>
          <label htmlFor="promo-url" className="block text-sm font-medium text-gray-700 mb-1">
            Ссылка (опционально)
          </label>
          <input
            id="promo-url"
            type="text"
            value={formData.url}
            onChange={(e) => setFormData({ ...formData, url: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            placeholder="/category/moloko"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="promo-sort" className="block text-sm font-medium text-gray-700 mb-1">
              Порядок сортировки
            </label>
            <input
              id="promo-sort"
              type="number"
              value={formData.sort}
              onChange={(e) => setFormData({ ...formData, sort: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="w-5 h-5 rounded border-gray-300"
              />
              <span className="text-sm font-medium text-gray-700">Активен</span>
            </label>
          </div>
        </div>

        <div className="flex gap-2 pt-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
          >
            {isSubmitting ? 'Сохранение...' : promotion ? 'Сохранить' : 'Добавить'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Отмена
          </button>
        </div>
      </form>
    </div>
  );
}
