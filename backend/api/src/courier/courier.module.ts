import { Module } from '@nestjs/common';
import { CourierAuthController } from './courier-auth.controller';
import { CourierOrdersController } from './courier-orders.controller';
import { CourierEventsController } from './courier-events.controller';
import { CourierJwtGuard } from './courier-jwt.guard';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [EventsModule],
  controllers: [
    CourierAuthController,
    CourierOrdersController,
    CourierEventsController,
  ],
  providers: [CourierJwtGuard],
  exports: [CourierJwtGuard],
})
export class CourierModule {}
