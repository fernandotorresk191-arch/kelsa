import { Module } from '@nestjs/common';
import { PrismaModule } from 'prisma/prisma.module';
import { AdminAuthController } from './admin-auth.controller';
import { AdminOrdersController } from './admin-orders.controller';
import { AdminProductsController } from './admin-products.controller';
import { AdminAnalyticsController } from './admin-analytics.controller';
import { AdminCategoriesController } from './admin-categories.controller';
import { AdminPromotionsController } from './admin-promotions.controller';

@Module({
  imports: [PrismaModule],
  controllers: [
    AdminAuthController,
    AdminOrdersController,
    AdminProductsController,
    AdminAnalyticsController,
    AdminCategoriesController,
    AdminPromotionsController,
  ],
})
export class AdminModule {}
