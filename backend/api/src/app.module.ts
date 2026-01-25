import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from 'prisma/prisma.module';
import { CatalogModule } from './catalog/catalog.module';
import { CartModule } from './cart/cart.module';
import { OrdersModule } from './orders/order.module';
import { AdminModule } from './admin/admin.module';
import { EventsModule } from './events/events.module';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth/auth.controller';
import { JwtGuard } from './auth/jwt.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    CatalogModule,
    CartModule,
    OrdersModule,
    AdminModule,
    EventsModule,
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET') ?? 'dev_secret',
        signOptions: { expiresIn: '30d' },
      }),
    }),
  ],
  controllers: [AppController, AuthController],
  providers: [AppService, JwtGuard],
})
export class AppModule {}
