import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { PromotionDto } from '../../features/catalog/types';
import { resolveMediaUrl } from '@/shared/api/media';

interface PromoBannerProps {
  promotion: PromotionDto;
}

const PromoBanner: React.FC<PromoBannerProps> = ({ promotion }) => {
  const imageUrl = resolveMediaUrl(promotion.imageUrl);
  
  if (!imageUrl) {
    return null;
  }

  const content = (
    <div className="relative w-full aspect-[21/9] max-h-[500px] overflow-hidden rounded-lg">
      <Image
        src={imageUrl}
        alt={promotion.title}
        fill
        className="object-cover transition-transform duration-300 hover:scale-105"
        priority
      />
    </div>
  );

  // Если есть ссылка - оборачиваем в Link
  if (promotion.url) {
    return (
      <Link href={promotion.url} className="block">
        {content}
      </Link>
    );
  }

  // Если нет ссылки - просто показываем изображение
  return content;
};

export default PromoBanner;
