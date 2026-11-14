import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { AppConfigService } from './config/app-config.service';
import { createValidationPipe } from './common/validation';

/** Configuración compartida por main.ts y los tests e2e. */
export function setupApp(app: NestExpressApplication): void {
  const config = app.get(AppConfigService);
  app.set('trust proxy', 1);
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cookieParser());
  app.enableCors({ origin: config.frontendUrl, credentials: true });

  // Fotos de animales (solo archivos de imagen validados al subirlos).
  // Con STORAGE_DRIVER=s3 las sirve el bucket y no hace falta exponer /uploads.
  if (config.storage.driver === 'local') {
    const uploads = resolve(config.uploadDir);
    mkdirSync(uploads, { recursive: true });
    app.useStaticAssets(uploads, {
      prefix: '/uploads/',
      index: false,
      dotfiles: 'deny',
      maxAge: '7d',
    });
  }

  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(createValidationPipe());
}
