import { Module } from '@nestjs/common';
import { CatalogController } from './catalog.controller';

@Module({
  controllers: [CatalogController],
})
// eslint-disable-next-line prettier/prettier
export class CatalogModule {}