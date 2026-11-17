import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { guardarEvidencia, login, nuevaPagina, USUARIOS } from './helpers';

/**
 * Accesibilidad automática con axe-core (@axe-core/playwright) en siete pantallas.
 * Se ejecutan todas las reglas de axe que no son experimentales (WCAG 2.0, 2.1 y 2.2 niveles A
 * y AA, y buenas prácticas); cada violación conserva sus etiquetas para distinguirlas.
 * La prueba con personas (cuestionario SUS) no se automatiza.
 */

interface Violacion {
  regla: string;
  impacto: string | null;
  elementos: number;
  descripcion: string;
  etiquetas: string[];
}

const resultados: {
  pagina: string;
  ruta: string;
  rol: string;
  violaciones: Violacion[];
  reglas_aprobadas: number;
  reglas_incompletas: number;
}[] = [];

async function analizar(page: Page, pagina: string, rol: string) {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(600);
  const r = await new AxeBuilder({ page }).analyze();
  resultados.push({
    pagina,
    ruta: new URL(page.url()).pathname,
    rol,
    violaciones: r.violations.map((v) => ({
      regla: v.id,
      impacto: v.impact ?? null,
      elementos: v.nodes.length,
      descripcion: v.help,
      etiquetas: v.tags.filter((t) => /^wcag|^best-practice$/.test(t)),
    })),
    reglas_aprobadas: r.passes.length,
    reglas_incompletas: r.incomplete.length,
  });
}

test.afterAll(() => {
  guardarEvidencia('accesibilidad.json', resultados);
  // Resumen para la consola (captura axe-resumen.png).
  for (const p of resultados) {
    console.log(`\n${p.pagina} (${p.ruta}) — ${p.violaciones.length} violaciones`);
    for (const v of p.violaciones) {
      console.log(`   ${(v.impacto ?? '-').padEnd(9)} ${v.regla.padEnd(28)} ${String(v.elementos).padStart(3)} elemento(s)`);
    }
  }
});

test('Accesibilidad: siete pantallas con axe-core', async ({ browser }) => {
  test.setTimeout(300_000);

  // Sin sesión: inicio de sesión e inicio público (primera visita, con el aviso de cookies).
  const visitante = await nuevaPagina(browser);
  await visitante.goto('/login');
  await expect(visitante.getByRole('button', { name: 'Iniciar sesión' })).toBeVisible();
  await analizar(visitante, 'Inicio de sesión', 'Sin sesión');
  await visitante.goto('/');
  await expect(visitante.getByRole('heading', { level: 1 }).first()).toBeVisible();
  await analizar(visitante, 'Inicio público', 'Visitante');
  await visitante.context().close();

  // Gestión: listado y registro de animales.
  const gestion = await nuevaPagina(browser);
  await login(gestion, USUARIOS.gestion);
  await gestion.getByRole('link', { name: 'Animales' }).click();
  await expect(gestion.getByPlaceholder('Buscar por código o nombre')).toBeVisible();
  await expect(gestion.getByRole('main').getByRole('link').first()).toBeVisible();
  await analizar(gestion, 'Listado de animales', 'Gestión Animal y Adopciones');
  await gestion.getByRole('link', { name: 'Registrar animal' }).click();
  await expect(gestion.getByRole('main').getByRole('heading', { name: 'Registrar animal' })).toBeVisible();
  await analizar(gestion, 'Registro de animal', 'Gestión Animal y Adopciones');
  await gestion.context().close();

  // Veterinario: nueva consulta y vacunas.
  const vet = await nuevaPagina(browser);
  await login(vet, USUARIOS.veterinario);
  await vet.getByRole('link', { name: 'Animales' }).click();
  await vet.getByPlaceholder('Buscar por código o nombre').fill('Canela');
  await vet.getByRole('link', { name: /Canela/ }).first().click();
  await vet.getByRole('link', { name: 'Nueva consulta' }).click();
  await expect(
    vet.getByRole('main').getByRole('heading', { name: 'Nueva consulta veterinaria' }),
  ).toBeVisible();
  await analizar(vet, 'Nueva consulta', 'Personal Veterinario');
  await vet.getByRole('link', { name: 'Vacunas', exact: true }).click();
  await expect(vet.getByRole('main').getByRole('heading', { name: 'Vacunas' })).toBeVisible();
  await analizar(vet, 'Vacunas', 'Personal Veterinario');
  await vet.context().close();

  // Administrador: usuarios.
  const admin = await nuevaPagina(browser);
  await login(admin, USUARIOS.admin);
  await admin.goto('/admin/usuarios');
  await expect(admin.getByRole('main').getByRole('heading', { level: 1 }).first()).toBeVisible();
  await expect(admin.getByRole('main').getByText('veterinario.prueba@zoonosis.test')).toBeVisible();
  await analizar(admin, 'Usuarios', 'Administrador');
  await admin.context().close();

  expect(resultados).toHaveLength(7);
});
