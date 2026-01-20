import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { JwtGuard } from '../auth/jwt.guard';

@Module({
  controllers: [OrdersController],
  providers: [JwtGuard],
})
// eslint-disable-next-line prettier/prettier
export class OrdersModule {}
