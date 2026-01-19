/* eslint-disable @typescript-eslint/no-floating-promises */
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = app.get(ConfigService);
  const corsEnv = config.get<string>('CORS_ORIGINS');
  const allowedOrigins: (string | RegExp)[] = corsEnv
    ? corsEnv
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean)
    : [
        'http://localhost:3000',
        'http://localhost:3001',
        'https://gokelsa.ru',
        // Разрешаем локальную сеть, чтобы PWA на телефоне могла ходить в API.
        /http:\/\/192\.168\.\d+\.\d+:3000/,
        /http:\/\/10\.\d+\.\d+\.\d+:3000/,
      ];

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Kelsa API')
    .setDescription('API for gokelsa.ru')
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  const port = config.get<number>('PORT') ?? 3001;
  await app.listen(port);
}
bootstrap();
