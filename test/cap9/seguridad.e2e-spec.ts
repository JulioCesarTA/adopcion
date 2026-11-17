/**
 * Pruebas manuales de seguridad del Capítulo IX: SEG-01 a SEG-19 (SEG-08 se comprueba con
 * Playwright en test/cap9/seg08-xss.spec.ts).
 *
 * - La aplicación se crea en el proceso con @nestjs/testing y setupApp(), igual que
 *   backend/test/*.e2e-spec.ts, contra la base de prueba (.env.test, puerto 5433).
 * - SEG-13 y SEG-18 consultan el sistema levantado con las imágenes de producción del repositorio
 *   detrás de nginx (http://localhost:3000, test/cap9/docker-compose.cap9.yml).
 * - Los usuarios se crean al empezar, con una contraseña aleatoria que solo existe en memoria.
 *   En la evidencia no se escribe ninguna contraseña, token ni cookie.
 * - Ninguna prueba corrige el código: si algo no cumple, la prueba falla y queda registrada.
 */
import { Test, type TestingModuleBuilder } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import type { App } from 'supertest/types';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { AppModule } from '../../backend/src/app.module';
import { setupApp } from '../../backend/src/setup-app';
import { PrismaService } from '../../backend/src/prisma/prisma.service';
import { DashboardService } from '../../backend/src/modules/dashboard/dashboard.service';

type Body = Record<string, any>;

interface Registro {
  id: string;
  nombre: string;
  enviado: string;
  esperado: string;
  codigo_http: string;
  mensaje: string;
  obtenido: string;
  estado: 'Aprobada' | 'Fallida';
}

const SISTEMA = 'http://localhost:3000';
const registros: Registro[] = [];

/** Guarda el resultado y hace fallar la prueba si no se cumple lo esperado. */
function registrar(r: Omit<Registro, 'estado'>, cumple: boolean) {
  registros.push({ ...r, estado: cumple ? 'Aprobada' : 'Fallida' });
  expect(cumple).toBe(true);
}

async function crearApp(
  ajuste?: (b: TestingModuleBuilder) => TestingModuleBuilder,
): Promise<NestExpressApplication> {
  let builder = Test.createTestingModule({ imports: [AppModule] });
  if (ajuste) builder = ajuste(builder);
  const moduleRef = await builder.compile();
  const app = moduleRef.createNestApplication<NestExpressApplication>({ logger: false });
  setupApp(app);
  await app.init();
  return app;
}

const mensaje = (b: Body) => String(b?.message ?? '');

describe('Seguridad (Capítulo IX)', () => {
  let app: NestExpressApplication;
  let server: App;
  let prisma: PrismaService;
  const otras: NestExpressApplication[] = [];

  const stamp = Date.now().toString(36);
  // Contraseña aleatoria, solo en memoria (cumple la política: letras y números, 8 o más).
  const clave = `Cap9${randomUUID().replace(/-/g, '').slice(0, 12)}x7`;
  // El sistema guarda y busca los correos en minúsculas.
  const correo = (rol: string) => `cap9.${rol.toLowerCase()}.${stamp}@zoonosis.test`;
  const ids: Record<string, string> = {};
  const tokens: Record<string, string> = {};
  let animalId = '';

  const api = (rol: string) => ({
    get: (url: string) =>
      request(server).get(`/api/v1${url}`).set('Authorization', `Bearer ${tokens[rol]}`),
    post: (url: string, body: object = {}) =>
      request(server)
        .post(`/api/v1${url}`)
        .set('Authorization', `Bearer ${tokens[rol]}`)
        .send(body),
    patch: (url: string, body: object = {}) =>
      request(server)
        .patch(`/api/v1${url}`)
        .set('Authorization', `Bearer ${tokens[rol]}`)
        .send(body),
  });

  beforeAll(async () => {
    app = await crearApp();
    server = app.getHttpServer();
    prisma = app.get(PrismaService);

    const passwordHash = await bcrypt.hash(clave, 10);
    const usuarios: [string, string, 'ADMIN' | 'VETERINARIO' | 'GESTION'][] = [
      ['admin', 'Administrador Cap9', 'ADMIN'],
      ['vetA', 'Veterinario A Cap9', 'VETERINARIO'],
      ['vetB', 'Veterinario B Cap9', 'VETERINARIO'],
      ['gestion', 'Gestion Cap9', 'GESTION'],
      ['bloqueo', 'Usuario Bloqueo Cap9', 'GESTION'],
      ['limitador', 'Usuario Limitador Cap9', 'GESTION'],
    ];
    for (const [rol, fullName, role] of usuarios) {
      const u = await prisma.user.create({
        data: { email: correo(rol), fullName, role, passwordHash },
      });
      ids[rol] = u.id;
    }
    for (const rol of ['admin', 'vetA', 'vetB', 'gestion']) {
      const res = await request(server)
        .post('/api/v1/auth/login')
        .send({ email: correo(rol), password: clave })
        .expect(200);
      tokens[rol] = (res.body as Body).accessToken as string;
    }

    // Animal propio de la prueba (lo registra Gestión, como en el sistema real).
    const animal = await api('gestion')
      .post('/animals', {
        name: `SEG ${stamp}`,
        species: 'PERRO',
        sex: 'MACHO',
        size: 'MEDIANO',
        energyLevel: 3,
        goodWithChildren: true,
        goodWithAnimals: true,
        needsYard: false,
        specialCare: false,
        requiredDailyHours: 2,
        entryDate: new Date().toISOString(),
        entryReason: 'Animal de la prueba de seguridad',
      })
      .expect(201);
    animalId = (animal.body as Body).id as string;
  });

  afterAll(async () => {
    const dir = resolve(__dirname, 'evidencia');
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      resolve(dir, 'seguridad-manuales.json'),
      JSON.stringify(registros, null, 2) + '\n',
      'utf8',
    );
    if (prisma) {
      await prisma.user
        .updateMany({ where: { id: ids.bloqueo }, data: { lockedUntil: null, failedAttempts: 0 } })
        .catch(() => undefined);
    }
    for (const a of otras) await a.close();
    await app?.close();
  });

  it('SEG-01: servicio protegido sin token', async () => {
    const res = await request(server).get('/api/v1/animals');
    registrar(
      {
        id: 'SEG-01',
        nombre: 'Servicio protegido sin token',
        enviado: 'GET /api/v1/animals sin la cabecera Authorization',
        esperado: 'El sistema rechaza la solicitud con 401 y no devuelve datos.',
        codigo_http: String(res.status),
        mensaje: mensaje(res.body),
        obtenido: `Respondió ${res.status} «${mensaje(res.body)}» y sin la lista de animales.`,
      },
      res.status === 401 && !('data' in (res.body as Body)),
    );
  });

  it('SEG-02: token con la firma alterada', async () => {
    const [h, p, s] = tokens.vetA.split('.');
    const firmaAlterada = `${h}.${p}.${s.slice(0, -6)}${s.slice(-6) === 'AAAAAA' ? 'BBBBBB' : 'AAAAAA'}`;
    // Segundo caso: se cambia el rol del contenido a ADMIN y se conserva la firma original.
    const contenido = JSON.parse(Buffer.from(p, 'base64url').toString('utf8')) as Body;
    const contenidoAlterado = Buffer.from(JSON.stringify({ ...contenido, role: 'ADMIN' })).toString(
      'base64url',
    );
    const rolAlterado = `${h}.${contenidoAlterado}.${s}`;
    const r1 = await request(server)
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${firmaAlterada}`);
    const r2 = await request(server)
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${rolAlterado}`);
    registrar(
      {
        id: 'SEG-02',
        nombre: 'Token con la firma alterada',
        enviado:
          'GET /api/v1/users con el token de un veterinario: (a) con los últimos caracteres de la firma cambiados; (b) con el rol del contenido cambiado a ADMIN y la firma original',
        esperado: 'El sistema rechaza los dos tokens con 401.',
        codigo_http: `${r1.status} / ${r2.status}`,
        mensaje: `${mensaje(r1.body)} / ${mensaje(r2.body)}`,
        obtenido: `(a) respondió ${r1.status} «${mensaje(r1.body)}»; (b) respondió ${r2.status} «${mensaje(r2.body)}».`,
      },
      r1.status === 401 && r2.status === 401,
    );
  });

  it('SEG-03: token vencido', async () => {
    const ahora = Math.floor(Date.now() / 1000);
    const vencido = await app
      .get(JwtService)
      .signAsync(
        { sub: ids.admin, role: 'ADMIN', iat: ahora - 1800, exp: ahora - 60 },
        { secret: process.env.JWT_ACCESS_SECRET },
      );
    const res = await request(server).get('/api/v1/users').set('Authorization', `Bearer ${vencido}`);
    registrar(
      {
        id: 'SEG-03',
        nombre: 'Token vencido',
        enviado:
          'GET /api/v1/users con un token de administrador firmado con la clave del entorno de prueba y vencido hace 60 s',
        esperado: 'El sistema rechaza el token vencido con 401.',
        codigo_http: String(res.status),
        mensaje: mensaje(res.body),
        obtenido: `Respondió ${res.status} «${mensaje(res.body)}».`,
      },
      res.status === 401,
    );
  });

  it('SEG-04: veterinario en la administración de usuarios', async () => {
    const lista = await api('vetA').get('/users');
    const nuevo = correo('intruso');
    const crear = await api('vetA').post('/users', {
      fullName: 'Usuario no autorizado',
      email: nuevo,
      role: 'ADMIN',
      password: clave,
    });
    const creado = await prisma.user.count({ where: { email: nuevo } });
    registrar(
      {
        id: 'SEG-04',
        nombre: 'Veterinario en la administración de usuarios',
        enviado:
          'Con el token de un veterinario: GET /api/v1/users y POST /api/v1/users (rol ADMIN, contraseña válida)',
        esperado: 'El sistema responde 403 en las dos operaciones y no crea el usuario.',
        codigo_http: `${lista.status} / ${crear.status}`,
        mensaje: `${mensaje(lista.body)} / ${mensaje(crear.body)}`,
        obtenido: `Listar respondió ${lista.status} y crear respondió ${crear.status} «${mensaje(crear.body)}»; usuarios creados: ${creado}.`,
      },
      lista.status === 403 && crear.status === 403 && creado === 0,
    );
  });

  it('SEG-05: veterinario que corrige la consulta de otro veterinario', async () => {
    const consulta = await api('vetA')
      .post(`/animals/${animalId}/consultations`, {
        consultationDate: new Date().toISOString(),
        reason: 'Control SEG-05',
        clinicalEvaluation: 'Sin hallazgos',
      })
      .expect(201);
    const cid = (consulta.body as Body).id as string;
    const res = await api('vetB').patch(`/consultations/${cid}`, {
      reason: 'Motivo cambiado por otro veterinario',
    });
    const despues = (await api('vetA').get(`/consultations/${cid}`).expect(200)).body as Body;
    registrar(
      {
        id: 'SEG-05',
        nombre: 'Veterinario que corrige la consulta de otro veterinario',
        enviado:
          'El veterinario A registra una consulta; el veterinario B envía PATCH /api/v1/consultations/:id con otro motivo',
        esperado: 'El sistema responde 403 y la consulta conserva el motivo original (RN-02).',
        codigo_http: String(res.status),
        mensaje: mensaje(res.body),
        obtenido: `Respondió ${res.status} «${mensaje(res.body)}»; el motivo guardado siguió siendo «${String(despues.reason)}».`,
      },
      res.status === 403 && despues.reason === 'Control SEG-05',
    );
  });

  it("SEG-06: inyección SQL en la búsqueda de animales (' OR '1'='1)", async () => {
    // El listado devuelve { data, meta: { page, pageSize, total } }.
    const total = ((await api('gestion').get('/animals').expect(200)).body as Body).meta
      ?.total as number;
    const res = await api('gestion').get('/animals').query({ q: "' OR '1'='1" });
    const body = res.body as Body;
    const encontrados = Array.isArray(body.data) ? (body.data as Body[]).length : null;
    registrar(
      {
        id: 'SEG-06',
        nombre: 'Inyección SQL en la búsqueda de animales',
        enviado: "GET /api/v1/animals?q=' OR '1'='1 (con el token de Gestión)",
        esperado:
          'El sistema trata el texto como un valor de búsqueda: responde 200 sin resultados y sin errores de base de datos.',
        codigo_http: String(res.status),
        mensaje: res.status === 200 ? `meta.total: ${String(body.meta?.total)}` : mensaje(body),
        obtenido: `Respondió ${res.status} con ${String(encontrados)} animales (sin filtro hay ${total}); no apareció ningún error de SQL.`,
      },
      res.status === 200 && encontrados === 0 && !/sql|syntax|prisma/i.test(JSON.stringify(body)),
    );
  });

  it('SEG-07: campo no permitido en el cuerpo (role al editar el propio perfil)', async () => {
    const res = await api('vetA').patch('/auth/me', {
      fullName: 'Veterinario A Cap9',
      role: 'ADMIN',
    });
    const yo = (await api('vetA').get('/auth/me').expect(200)).body as Body;
    registrar(
      {
        id: 'SEG-07',
        nombre: 'Campo no permitido en el cuerpo',
        enviado: 'PATCH /api/v1/auth/me con { fullName, role: "ADMIN" } (token de veterinario)',
        esperado: 'El sistema responde 400 por el campo no permitido y el rol no cambia.',
        codigo_http: String(res.status),
        mensaje: JSON.stringify((res.body as Body).errors ?? mensaje(res.body)),
        obtenido: `Respondió ${res.status} «${mensaje(res.body)}»; el rol siguió siendo ${String(yo.role)}.`,
      },
      res.status === 400 && yo.role === 'VETERINARIO',
    );
  });

  it('SEG-09: cinco contraseñas incorrectas seguidas (bloqueo de 10 minutos)', async () => {
    const appB = await crearApp();
    otras.push(appB);
    const s = appB.getHttpServer();
    const estados: number[] = [];
    const mensajes: string[] = [];
    for (let i = 0; i < 5; i++) {
      const r = await request(s)
        .post('/api/v1/auth/login')
        .send({ email: correo('bloqueo'), password: 'Incorrecta123' });
      estados.push(r.status);
      mensajes.push(mensaje(r.body));
    }
    const conClave = await request(s)
      .post('/api/v1/auth/login')
      .send({ email: correo('bloqueo'), password: clave });
    const u = await prisma.user.findUniqueOrThrow({ where: { id: ids.bloqueo } });
    const minutos = u.lockedUntil ? (u.lockedUntil.getTime() - Date.now()) / 60_000 : 0;
    registrar(
      {
        id: 'SEG-09',
        nombre: 'Cinco contraseñas incorrectas seguidas',
        enviado:
          'Cinco POST /api/v1/auth/login con una contraseña incorrecta y luego uno con la contraseña válida',
        esperado:
          'Los cuatro primeros intentos responden 401; el quinto bloquea la cuenta por 10 minutos (429) y el intento con la contraseña válida también se rechaza mientras dure el bloqueo.',
        codigo_http: `${estados.join(', ')} / ${conClave.status}`,
        mensaje: `${mensajes[0]} … ${mensajes[4]} / ${mensaje(conClave.body)}`,
        obtenido: `Respondió ${estados.join(', ')}; con la contraseña válida respondió ${conClave.status} «${mensaje(conClave.body)}»; bloqueo registrado por ${minutos.toFixed(1)} min.`,
      },
      estados.slice(0, 4).every((c) => c === 401) &&
        estados[4] === 429 &&
        conClave.status === 429 &&
        minutos > 9 &&
        minutos <= 10,
    );
  });

  it('SEG-10: once inicios de sesión en 60 s (limitador)', async () => {
    const appC = await crearApp();
    otras.push(appC);
    const s = appC.getHttpServer();
    const inicio = Date.now();
    const estados: number[] = [];
    let ultimo: Body = {};
    for (let i = 0; i < 11; i++) {
      const r = await request(s)
        .post('/api/v1/auth/login')
        .send({ email: correo('limitador'), password: clave });
      estados.push(r.status);
      ultimo = r.body as Body;
    }
    const segundos = (Date.now() - inicio) / 1000;
    registrar(
      {
        id: 'SEG-10',
        nombre: 'Once inicios de sesión en 60 s',
        enviado: `Once POST /api/v1/auth/login con la contraseña válida, desde la misma IP, en ${segundos.toFixed(1)} s`,
        esperado: 'Los diez primeros se atienden (200) y el undécimo se rechaza con 429.',
        codigo_http: estados.join(', '),
        mensaje: mensaje(ultimo),
        obtenido: `Respondió ${estados.slice(0, 10).filter((c) => c === 200).length} veces 200 y el undécimo ${estados[10]} «${mensaje(ultimo)}».`,
      },
      estados.slice(0, 10).every((c) => c === 200) && estados[10] === 429 && segundos < 60,
    );
  });

  it('SEG-11: PDF renombrado a .jpg como foto del animal', async () => {
    const pdf = Buffer.concat([
      Buffer.from('%PDF-1.4\n%\xe2\xe3\xcf\xd3\n1 0 obj << /Type /Catalog >> endobj\n', 'latin1'),
      Buffer.alloc(2048, 0x20),
      Buffer.from('\n%%EOF\n'),
    ]);
    const res = await request(server)
      .post(`/api/v1/animals/${animalId}/photo`)
      .set('Authorization', `Bearer ${tokens.gestion}`)
      .attach('file', pdf, { filename: 'foto-del-animal.jpg', contentType: 'image/jpeg' });
    const animal = (await api('gestion').get(`/animals/${animalId}`).expect(200)).body as Body;
    registrar(
      {
        id: 'SEG-11',
        nombre: 'PDF renombrado a .jpg como foto del animal',
        enviado:
          'POST /api/v1/animals/:id/photo con un PDF de 2 KB llamado foto-del-animal.jpg y tipo image/jpeg',
        esperado:
          'El sistema detecta que el contenido no es una imagen, responde 400 y no guarda la foto.',
        codigo_http: String(res.status),
        mensaje: mensaje(res.body),
        obtenido: `Respondió ${res.status} «${mensaje(res.body)}»; foto del animal: ${animal.photoUrl ? 'guardada' : 'sin foto'}.`,
      },
      res.status === 400 && !animal.photoUrl,
    );
  });

  it('SEG-12: foto de más de 5 MB', async () => {
    const jpeg = (bytes: number) => {
      const b = Buffer.alloc(bytes, 0x00);
      b[0] = 0xff;
      b[1] = 0xd8;
      b[2] = 0xff;
      b[3] = 0xe0;
      return b;
    };
    const seis = await request(server)
      .post(`/api/v1/animals/${animalId}/photo`)
      .set('Authorization', `Bearer ${tokens.gestion}`)
      .attach('file', jpeg(6 * 1024 * 1024), { filename: 'grande.jpg', contentType: 'image/jpeg' });
    const justo = await request(server)
      .post(`/api/v1/animals/${animalId}/photo`)
      .set('Authorization', `Bearer ${tokens.gestion}`)
      .attach('file', jpeg(5 * 1024 * 1024 + 1), {
        filename: 'limite.jpg',
        contentType: 'image/jpeg',
      });
    const animal = (await api('gestion').get(`/animals/${animalId}`).expect(200)).body as Body;
    registrar(
      {
        id: 'SEG-12',
        nombre: 'Foto de más de 5 MB',
        enviado:
          'POST /api/v1/animals/:id/photo con un JPG de 6 MB y con un JPG de 5 MB + 1 byte',
        esperado:
          'El sistema rechaza los dos archivos (400 o 413) con un mensaje claro y no guarda la foto.',
        codigo_http: `${seis.status} / ${justo.status}`,
        mensaje: `${mensaje(seis.body)} / ${mensaje(justo.body)}`,
        obtenido: `6 MB: ${seis.status} «${mensaje(seis.body)}»; 5 MB + 1 byte: ${justo.status} «${mensaje(justo.body)}»; foto del animal: ${animal.photoUrl ? 'guardada' : 'sin foto'}.`,
      },
      [400, 413].includes(seis.status) && [400, 413].includes(justo.status) && !animal.photoUrl,
    );
  });

  it('SEG-13: cabeceras de seguridad de la API y del frontend', async () => {
    const apiRes = await fetch(`${SISTEMA}/api/v1/health`);
    const web = await fetch(`${SISTEMA}/`);
    const h = (r: Response, n: string) => r.headers.get(n);
    const lista = (r: Response) =>
      [
        'x-content-type-options',
        'x-frame-options',
        'content-security-policy',
        'strict-transport-security',
        'referrer-policy',
        'cross-origin-opener-policy',
        'x-powered-by',
      ]
        .map((n) => `${n}: ${h(r, n) === null ? '(ausente)' : String(h(r, n)).slice(0, 60)}`)
        .join('; ');
    const antiEncuadre = (r: Response) =>
      h(r, 'x-frame-options') !== null || /frame-ancestors/i.test(h(r, 'content-security-policy') ?? '');
    // Si la cabecera llega dos veces (helmet y nginx), fetch las une con «, »; el navegador
    // toma el primer valor, por eso se comprueba que empiece por nosniff.
    const repetida = (r: Response, n: string) => (h(r, n) ?? '').includes(',');
    const basicas = (r: Response) =>
      /^\s*nosniff\b/i.test(h(r, 'x-content-type-options') ?? '') &&
      h(r, 'referrer-policy') !== null &&
      antiEncuadre(r) &&
      h(r, 'x-powered-by') === null;
    registrar(
      {
        id: 'SEG-13',
        nombre: 'Cabeceras de seguridad de la API y del frontend',
        enviado: `GET ${SISTEMA}/api/v1/health (API) y GET ${SISTEMA}/ (frontend), a través de nginx`,
        esperado:
          'La API y el frontend envían X-Content-Type-Options: nosniff, Referrer-Policy y protección contra el encuadre (X-Frame-Options o CSP frame-ancestors), y no envían X-Powered-By.',
        codigo_http: `${apiRes.status} / ${web.status}`,
        mensaje: `API → ${lista(apiRes)} | Frontend → ${lista(web)}`,
        obtenido: `API: ${basicas(apiRes) ? 'cumple' : 'no cumple'} (anti-encuadre ${antiEncuadre(apiRes) ? 'presente' : 'ausente'}${repetida(apiRes, 'x-content-type-options') || repetida(apiRes, 'referrer-policy') ? '; X-Content-Type-Options y Referrer-Policy llegan duplicadas porque las ponen helmet y nginx' : ''}); frontend: ${basicas(web) ? 'cumple' : 'no cumple'} (anti-encuadre ${antiEncuadre(web) ? 'presente' : 'ausente'}, CSP ${h(web, 'content-security-policy') === null ? 'ausente' : 'presente'}).`,
      },
      basicas(apiRes) && basicas(web),
    );
  });

  it('SEG-14: CORS con un origen no permitido', async () => {
    const ajeno = 'https://origen-no-permitido.example';
    const permitido = process.env.FRONTEND_URL ?? '';
    const r1 = await request(server)
      .options('/api/v1/auth/login')
      .set('Origin', ajeno)
      .set('Access-Control-Request-Method', 'POST');
    const r2 = await request(server)
      .options('/api/v1/auth/login')
      .set('Origin', permitido)
      .set('Access-Control-Request-Method', 'POST');
    const acao1 = r1.headers['access-control-allow-origin'] as string | undefined;
    const acao2 = r2.headers['access-control-allow-origin'] as string | undefined;
    const local = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(permitido);
    const nombre = (v?: string) =>
      v === undefined ? '(ausente)' : v === permitido ? (local ? v : 'el origen configurado del frontend') : v;
    registrar(
      {
        id: 'SEG-14',
        nombre: 'CORS con un origen no permitido',
        enviado: `OPTIONS /api/v1/auth/login con Origin: ${ajeno} y, para comparar, con el origen configurado del frontend`,
        esperado:
          'El sistema no autoriza el origen ajeno: Access-Control-Allow-Origin no contiene ese origen ni «*»; el origen del frontend sí queda autorizado.',
        codigo_http: `${r1.status} / ${r2.status}`,
        mensaje: `Origen ajeno → Access-Control-Allow-Origin: ${nombre(acao1)} | Origen del frontend → ${nombre(acao2)}`,
        obtenido: `Con el origen ajeno respondió ${r1.status} y Access-Control-Allow-Origin fue ${nombre(acao1)}; con el del frontend fue ${nombre(acao2)}.`,
      },
      acao1 !== ajeno && acao1 !== '*' && acao2 === permitido,
    );
  });

  it('SEG-15: error interno sin la traza ni detalles internos', async () => {
    const detalle = 'Fallo simulado: tabla animals no disponible en db-interna:5432';
    const appD = await crearApp((b) =>
      b.overrideProvider(DashboardService).useValue({
        dashboard: () => Promise.reject(new Error(detalle)),
      }),
    );
    otras.push(appD);
    const res = await request(appD.getHttpServer())
      .get('/api/v1/dashboard')
      .set('Authorization', `Bearer ${tokens.gestion}`);
    const texto = JSON.stringify(res.body);
    const filtra = /Fallo simulado|db-interna|stack|\bat\s|\.ts\b|node_modules|prisma/i.test(texto);
    registrar(
      {
        id: 'SEG-15',
        nombre: 'Error interno sin traza ni detalles',
        enviado:
          'GET /api/v1/dashboard en una instancia donde el servicio del panel lanza un error con detalles internos (proveedor reemplazado con overrideProvider)',
        esperado:
          'El sistema responde 500 con un mensaje genérico, sin la traza, rutas de archivos ni el texto del error interno.',
        codigo_http: String(res.status),
        mensaje: mensaje(res.body),
        obtenido: `Respondió ${res.status} con el cuerpo ${texto}; ${filtra ? 'incluyó' : 'no incluyó'} detalles internos.`,
      },
      res.status === 500 && !filtra,
    );
  });

  it('SEG-16: contraseña débil al crear un usuario', async () => {
    const base = { fullName: 'Usuario Débil', role: 'GESTION' };
    const corta = await api('admin').post('/users', { ...base, email: correo('debil1'), password: 'abc12' });
    const sinNumero = await api('admin').post('/users', {
      ...base,
      email: correo('debil2'),
      password: 'solamenteletras',
    });
    const creados = await prisma.user.count({
      where: { email: { in: [correo('debil1'), correo('debil2')] } },
    });
    const errores = (r: request.Response) =>
      JSON.stringify(((r.body as Body).errors ?? []) as unknown[]);
    registrar(
      {
        id: 'SEG-16',
        nombre: 'Contraseña débil al crear un usuario',
        enviado:
          'POST /api/v1/users (administrador) con una contraseña de 5 caracteres y con otra de 15 letras sin números',
        esperado:
          'El sistema responde 400 con el mensaje de la política de contraseñas y no crea los usuarios.',
        codigo_http: `${corta.status} / ${sinNumero.status}`,
        mensaje: `${errores(corta)} / ${errores(sinNumero)}`,
        obtenido: `Respondió ${corta.status} y ${sinNumero.status}; usuarios creados: ${creados}.`,
      },
      corta.status === 400 && sinNumero.status === 400 && creados === 0,
    );
  });

  it('SEG-17: refresh token de un usuario desactivado', async () => {
    const creado = await api('admin')
      .post('/users', {
        fullName: 'Usuario Desactivado Cap9',
        email: correo('desactivado'),
        role: 'GESTION',
        password: clave,
      })
      .expect(201);
    const uid = (creado.body as Body).id as string;
    const login = await request(server)
      .post('/api/v1/auth/login')
      .send({ email: correo('desactivado'), password: clave })
      .expect(200);
    const cookie = ([] as string[])
      .concat(login.headers['set-cookie'] ?? [])
      .find((c) => c.startsWith('refresh_token='));
    await api('admin').patch(`/users/${uid}/active`, { isActive: false }).expect(200);
    const res = await request(server)
      .post('/api/v1/auth/refresh')
      .set('Cookie', (cookie ?? '').split(';')[0]);
    registrar(
      {
        id: 'SEG-17',
        nombre: 'Refresh token de un usuario desactivado',
        enviado:
          'El usuario inicia sesión (recibe la cookie del refresh token); el administrador lo desactiva; se envía POST /api/v1/auth/refresh con esa cookie',
        esperado: 'El sistema responde 401 y no emite un token nuevo (RN-10).',
        codigo_http: String(res.status),
        mensaje: mensaje(res.body),
        obtenido: `Respondió ${res.status} «${mensaje(res.body)}»; token nuevo: ${(res.body as Body).accessToken ? 'sí' : 'no'}.`,
      },
      Boolean(cookie) && res.status === 401 && !(res.body as Body).accessToken,
    );
  });

  it('SEG-18: Swagger con la configuración de producción', async () => {
    const pagina = await fetch(`${SISTEMA}/api/docs`);
    const json = await fetch(`${SISTEMA}/api/docs-json`);
    let rutas = 0;
    if (json.ok) {
      const doc = (await json.json()) as Body;
      rutas = Object.keys((doc.paths ?? {}) as Body).length;
    }
    registrar(
      {
        id: 'SEG-18',
        nombre: 'Swagger con la configuración de producción',
        enviado: `GET ${SISTEMA}/api/docs y GET ${SISTEMA}/api/docs-json, con la imagen de producción del backend (NODE_ENV=production) detrás de nginx`,
        esperado:
          'Con la configuración de producción, la documentación Swagger no está disponible públicamente (404 o acceso restringido).',
        codigo_http: `${pagina.status} / ${json.status}`,
        mensaje: json.ok ? `La especificación OpenAPI publicó ${rutas} rutas` : `docs-json: ${json.status}`,
        obtenido: `/api/docs respondió ${pagina.status} y /api/docs-json respondió ${json.status}${json.ok ? ` con ${rutas} rutas de la API` : ''}.`,
      },
      !pagina.ok && !json.ok,
    );
  });

  it('SEG-19: seis solicitudes al portal público en 60 s', async () => {
    const asunto = `SEG-19 ${stamp}`;
    const inicio = Date.now();
    const estados: number[] = [];
    let ultimo: Body = {};
    for (let i = 0; i < 6; i++) {
      const r = await request(server)
        .post('/api/v1/public/contact')
        .send({
          name: 'Visitante de prueba',
          email: 'visitante.seg19@example.com',
          subject: asunto,
          message: `Mensaje ${i + 1} de la prueba del limitador del portal público.`,
          acceptPrivacy: true,
        });
      estados.push(r.status);
      ultimo = r.body as Body;
    }
    const segundos = (Date.now() - inicio) / 1000;
    const guardados = await prisma.contactMessage.count({ where: { subject: asunto } });
    registrar(
      {
        id: 'SEG-19',
        nombre: 'Seis solicitudes al portal público en 60 s',
        enviado: `Seis POST /api/v1/public/contact válidos desde la misma IP en ${segundos.toFixed(1)} s`,
        esperado:
          'Los cinco primeros se atienden (200) y el sexto se rechaza con 429; solo se guardan cinco mensajes.',
        codigo_http: estados.join(', '),
        mensaje: mensaje(ultimo),
        obtenido: `Respondió ${estados.join(', ')}; el sexto devolvió «${mensaje(ultimo)}»; mensajes guardados: ${guardados}.`,
      },
      estados.slice(0, 5).every((c) => c === 200) && estados[5] === 429 && guardados === 5,
    );
  });
});
