import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // The gateway forwards `/api/tasks/...` unchanged, so the app serves under
  // the same `/api` prefix as the rest of the microservice platform.
  app.setGlobalPrefix('api');

  // The browser talks to the gateway cross-origin (Quasar dev server -> :8080),
  // so CORS must be permitted here the way django-cors-headers did for Django.
  app.enableCors({
    origin: true,
    credentials: true,
    allowedHeaders: ['Authorization', 'Content-Type'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(process.env.PORT ?? 8000);
}
void bootstrap();
