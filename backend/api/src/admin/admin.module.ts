import { Module } from '@nestjs/common';
import { PrismaModule } from 'prisma/prisma.module';
import { AdminAuthController } from './admin-auth.controller';
import { AdminOrdersController } from './admin-orders.controller';
import { AdminProductsController } from './admin-products.controller';
import { AdminAnalyticsController } from './admin-analytics.controller';
import { AdminCategoriesController } from './admin-categories.controller';
import { AdminPromotionsController } from './admin-promotions.controller';
import { AdminPurchasesController } from './admin-purchases.controller';
import { AdminExpiryController } from './admin-expiry.controller';
import { AdminCouriersController } from './admin-couriers.controller';
import { AdminDeliveryZonesController } from './admin-delivery-zones.controller';
import { AdminServerController } from './admin-server.controller';
import { AdminDarkstoresController } from './admin-darkstores.controller';
import { AdminClientsController } from './admin-clients.controller';
import { CronRegistryService } from './cron-registry.service';
import { AdminGuard } from './admin.guard';
import { PushModule } from '../push/push.module';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [PrismaModule, PushModule, EventsModule],
  controllers: [
    AdminAuthController,
    AdminOrdersController,
    AdminProductsController,
    AdminAnalyticsController,
    AdminCategoriesController,
    AdminPromotionsController,
    AdminPurchasesController,
    AdminExpiryController,
    AdminCouriersController,
    AdminDeliveryZonesController,
    AdminServerController,
    AdminDarkstoresController,
    AdminClientsController,
  ],
  providers: [AdminPurchasesController, CronRegistryService, AdminGuard],
  exports: [CronRegistryService],
})
export class AdminModule {}
