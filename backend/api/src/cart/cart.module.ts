import { Module } from '@nestjs/common';
import { CartController } from './cart.controller';

@Module({
  controllers: [CartController],
})
// eslint-disable-next-line prettier/prettier
export class CartModule {}