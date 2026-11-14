import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { AppConfigService } from '../../config/app-config.service';

export type ImageExt = 'jpg' | 'png' | 'webp';

const CONTENT_TYPES: Record<ImageExt, string> = {
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

/**
 * Almacenamiento de archivos subidos con dos drivers intercambiables:
 * `local` (disco del servidor, servido en /uploads) y `s3` (bucket de S3).
 * El driver se elige con STORAGE_DRIVER y el resto del código no lo distingue:
 * `put` siempre devuelve la URL que se guarda en `animals.photo_url`.
 */
@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private s3?: S3Client;

  constructor(private readonly config: AppConfigService) {}

  onModuleInit(): void {
    const { driver, s3 } = this.config.storage;
    if (driver !== 's3') {
      this.logger.log(`Almacenamiento: disco local (${resolve(this.config.uploadDir)})`);
      return;
    }
    // Sin credenciales explícitas el SDK usa la cadena por defecto, que en EC2
    // resuelve el rol IAM de la instancia. Es lo preferible en producción.
    this.s3 = new S3Client({
      region: s3.region,
      ...(s3.accessKeyId && s3.secretAccessKey
        ? { credentials: { accessKeyId: s3.accessKeyId, secretAccessKey: s3.secretAccessKey } }
        : {}),
    });
    this.logger.log(`Almacenamiento: S3 bucket "${s3.bucket}" en ${s3.region}`);
  }

  /** Guarda el archivo y devuelve la URL pública que se persiste en la BD. */
  async put(key: string, body: Buffer, ext: ImageExt): Promise<string> {
    return this.config.storage.driver === 's3'
      ? this.putS3(key, body, ext)
      : this.putLocal(key, body);
  }

  /** Borra el archivo anterior. Nunca lanza: un huérfano no debe romper la petición. */
  async remove(url: string | null | undefined): Promise<void> {
    if (!url) return;
    try {
      const key = this.keyFromUrl(url);
      if (!key) return;
      if (this.s3) {
        await this.s3.send(
          new DeleteObjectCommand({ Bucket: this.config.storage.s3.bucket, Key: key }),
        );
      } else {
        await unlink(join(resolve(this.config.uploadDir), key));
      }
    } catch (err) {
      this.logger.warn(`No se pudo borrar ${url}: ${(err as Error).message}`);
    }
  }

  private async putLocal(key: string, body: Buffer): Promise<string> {
    const path = join(resolve(this.config.uploadDir), key);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, body);
    return `/uploads/${key}`;
  }

  private async putS3(key: string, body: Buffer, ext: ImageExt): Promise<string> {
    const { bucket } = this.config.storage.s3;
    await this.s3!.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: CONTENT_TYPES[ext],
        CacheControl: 'public, max-age=31536000, immutable',
      }),
    );
    return `${this.publicBase()}/${key}`;
  }

  /** Base pública: CloudFront o dominio propio si está configurado; si no, el endpoint del bucket. */
  private publicBase(): string {
    const { bucket, region, publicBaseUrl } = this.config.storage.s3;
    if (publicBaseUrl) return publicBaseUrl.replace(/\/+$/, '');
    return `https://${bucket}.s3.${region}.amazonaws.com`;
  }

  /** Extrae la clave del objeto a partir de una URL que este servicio generó. */
  private keyFromUrl(url: string): string | null {
    if (url.startsWith('/uploads/')) return url.slice('/uploads/'.length);
    if (this.config.storage.driver === 's3') {
      const base = `${this.publicBase()}/`;
      if (url.startsWith(base)) return url.slice(base.length);
    }
    return null;
  }
}
