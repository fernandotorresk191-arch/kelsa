'use client';

import React, { useCallback, useState } from 'react';
import { Upload, X, Loader2, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { resolveMediaUrl } from '@/shared/api/media';

interface ImageUploadProps {
  currentImageUrl?: string | null;
  onUpload: (file: File) => Promise<string>;
  onDelete: () => Promise<void>;
  label?: string;
  disabled?: boolean;
}

export function ImageUpload({
  currentImageUrl,
  onUpload,
  onDelete,
  label = 'Изображение',
  disabled = false,
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(currentImageUrl || null);

  const resolvedUrl = imageUrl ? resolveMediaUrl(imageUrl) : null;

  const handleFileSelect = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      // Валидация типа файла
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      if (!allowedTypes.includes(file.type)) {
        setError('Разрешены только изображения (JPG, PNG, WebP, GIF)');
        return;
      }

      // Валидация размера (5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Максимальный размер файла: 5MB');
        return;
      }

      setError(null);
      
      // Показываем превью локально
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      // Загружаем на сервер
      setIsUploading(true);
      try {
        const uploadedUrl = await onUpload(file);
        setImageUrl(uploadedUrl);
        setPreviewUrl(null);
      } catch (err) {
        console.error('Ошибка загрузки:', err);
        setError('Ошибка загрузки изображения');
        setPreviewUrl(null);
      } finally {
        setIsUploading(false);
      }

      // Сбрасываем input для повторной загрузки того же файла
      event.target.value = '';
    },
    [onUpload]
  );

  const handleDelete = useCallback(async () => {
    if (!imageUrl) return;

    setIsDeleting(true);
    setError(null);
    try {
      await onDelete();
      setImageUrl(null);
      setPreviewUrl(null);
    } catch (err: unknown) {
      const message = err instanceof Error 
        ? err.message 
        : typeof err === 'object' && err !== null && 'message' in err
        ? String((err as { message: unknown }).message)
        : 'Неизвестная ошибка';
      console.error('Ошибка удаления:', message);
      setError(`Ошибка удаления: ${message}`);
    } finally {
      setIsDeleting(false);
    }
  }, [imageUrl, onDelete]);

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();

      if (disabled || isUploading) return;

      const file = event.dataTransfer.files?.[0];
      if (!file) return;

      // Создаём синтетический event для handleFileSelect
      const input = document.createElement('input');
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      input.files = dataTransfer.files;

      handleFileSelect({
        target: input,
      } as React.ChangeEvent<HTMLInputElement>);
    },
    [disabled, isUploading, handleFileSelect]
  );

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const displayUrl = previewUrl || resolvedUrl;

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700">{label}</label>

      <div
        className={`relative border-2 border-dashed rounded-lg transition-colors ${
          disabled
            ? 'border-gray-200 bg-gray-50'
            : 'border-gray-300 hover:border-gray-400 bg-white'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        {displayUrl ? (
          <div className="relative aspect-video">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={displayUrl}
              alt="Превью"
              className="w-full h-full object-contain rounded-lg"
            />
            {isUploading && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                <Loader2 className="h-8 w-8 animate-spin text-white" />
              </div>
            )}
            {!isUploading && !disabled && (
              <div className="absolute top-2 right-2 flex gap-2">
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={handleDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <X className="h-4 w-4" />
                  )}
                </Button>
              </div>
            )}
          </div>
        ) : (
          <label
            className={`flex flex-col items-center justify-center py-8 px-4 cursor-pointer ${
              disabled ? 'cursor-not-allowed' : ''
            }`}
          >
            {isUploading ? (
              <Loader2 className="h-10 w-10 animate-spin text-gray-400 mb-2" />
            ) : (
              <div className="flex flex-col items-center">
                <div className="p-3 bg-gray-100 rounded-full mb-3">
                  <ImageIcon className="h-6 w-6 text-gray-500" />
                </div>
                <Upload className="h-6 w-6 text-gray-400 mb-2" />
                <span className="text-sm text-gray-600">
                  Перетащите изображение сюда или
                </span>
                <span className="text-sm text-blue-600 hover:text-blue-700">
                  выберите файл
                </span>
                <span className="text-xs text-gray-400 mt-1">
                  JPG, PNG, WebP, GIF до 5MB
                </span>
              </div>
            )}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={handleFileSelect}
              disabled={disabled || isUploading}
            />
          </label>
        )}
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
