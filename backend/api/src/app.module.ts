import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ScheduleModule } from '@nestjs/schedule';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from 'prisma/prisma.module';
import { CatalogModule } from './catalog/catalog.module';
import { CartModule } from './cart/cart.module';
import { OrdersModule } from './orders/order.module';
import { AdminModule } from './admin/admin.module';
import { CourierModule } from './courier/courier.module';
import { EventsModule } from './events/events.module';
import { UploadModule } from './upload/upload.module';
import { PushModule } from './push/push.module';
import { ChatModule } from './chat/chat.module';
import { KopilkaModule } from './kopilka/kopilka.module';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth/auth.controller';
import { JwtGuard } from './auth/jwt.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    // Раздаём статические файлы из /uploads
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
    }),
    PrismaModule,
    CatalogModule,
    CartModule,
    OrdersModule,
    AdminModule,
    CourierModule,
    EventsModule,
    UploadModule,
    PushModule,
    ChatModule,
    KopilkaModule,
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
