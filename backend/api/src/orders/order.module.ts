import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';

@Module({
  controllers: [OrdersController],
})
// eslint-disable-next-line prettier/prettier
export class OrdersModule {}