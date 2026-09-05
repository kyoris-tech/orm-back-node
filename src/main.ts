import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

const API_PREFIX = 'api/v1';
const DEFAULT_PORT = 3000;

const DEFAULT_CORS_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3001',
  'http://localhost:3001',
];

function resolveCorsOrigins(): string[] {
  const configured = process.env.CORS_ORIGINS;

  if (!configured) {
    return DEFAULT_CORS_ORIGINS;
  }

  return configured
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function setupSwagger(
  app: Awaited<ReturnType<typeof NestFactory.create>>,
): void {
  const config = new DocumentBuilder()
    .setTitle('Orm Intelligence API')
    .setDescription('Documentação da API da Orm Intelligence')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, config));
}

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix(API_PREFIX, { exclude: ['/'] });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors({
    origin: resolveCorsOrigins(),
    credentials: true,
  });

  if (process.env.NODE_ENV !== 'production') {
    setupSwagger(app);
  }

  await app.listen(process.env.PORT ?? DEFAULT_PORT);
}

void bootstrap();
