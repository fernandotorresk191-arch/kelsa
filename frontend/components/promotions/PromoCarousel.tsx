"use client";

import React, { useEffect, useState } from 'react';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "../ui/carousel";
import { catalogApi } from '../../features/catalog/api';
import type { PromotionDto } from '../../features/catalog/types';
import PromoBanner from './PromoBanner';

const PromoCarousel = () => {
  const [promotions, setPromotions] = useState<PromotionDto[]>([]);

  useEffect(() => {
    catalogApi.promotions()
      .then(data => setPromotions(data))
      .catch(() => setPromotions([]));
  }, []);

  if (promotions.length === 0) {
    return null;
  }

  return (
    <Carousel className="w-full">
      <CarouselContent>
        {promotions.map((promo) => (
          <CarouselItem key={promo.id}>
            <PromoBanner promotion={promo} />
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious className="left-2" />
      <CarouselNext className="right-2" />
    </Carousel>
  );
};

export default PromoCarousel;
