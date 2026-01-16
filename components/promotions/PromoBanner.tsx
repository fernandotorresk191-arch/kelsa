import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Promotion } from '../../lib/data';

interface PromoBannerProps {
  promotion: Promotion;
}

const PromoBanner: React.FC<PromoBannerProps> = ({ promotion }) => {
  return (
    <Link href={promotion.url} className="block">
      <div className="relative aspect-[3/1] overflow-hidden rounded-lg">
        <Image
          src={promotion.imageUrl}
          alt={promotion.title}
          fill
          className="object-cover transition-transform duration-300 hover:scale-105"
        />
      </div>
    </Link>
  );
};

export default PromoBanner;
