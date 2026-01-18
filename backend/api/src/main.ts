import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: [
      'http://localhost:3000', // Next dev
      'http://localhost:3001', // если нужно
      'https://gokelsa.ru', // прод
    ],
    credentials: true,
  });

  const config = app.get(ConfigService);
  const port = config.get<number>('PORT') ?? 3001;

  await app.listen(port);
}
bootstrap();