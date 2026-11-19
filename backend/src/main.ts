import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AppConfigService } from './config/app-config.service';
import { setupApp } from './setup-app';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  setupApp(app);

  const doc = new DocumentBuilder()
    .setTitle('Adopet — API')
    .setDescription('Gestión de adopciones y trazabilidad sanitaria animal')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, doc));

  const port = app.get(AppConfigService).port;
  // 0.0.0.0 para que el contenedor acepte conexiones desde nginx.
  await app.listen(port, '0.0.0.0');
  console.log(`API en http://localhost:${port}/api/v1 — Swagger en /api/docs`);
}

void bootstrap();
