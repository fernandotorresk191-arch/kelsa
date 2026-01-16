"use client";

import React from 'react';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "../ui/carousel";
import { promotions } from '../../lib/data';
import PromoBanner from './PromoBanner';

const PromoCarousel = () => {
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
