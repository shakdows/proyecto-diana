/**
 * Lee las carpetas donde se dejan archivos a mano y reescribe los manifiestos
 * que consume la aplicación: las fotos de vehículos y el logotipo oficial.
 *
 * Hace falta un manifiesto porque `AssetImage` termina dentro del paquete del
 * navegador —lo usan componentes de cliente—, y allí no hay disco que listar.
 * La alternativa, escribir la lista a mano, es justo el error que este proyecto
 * intenta evitar: una foto que está en la carpeta y no aparece en pantalla, sin
 * que nada falle.
 *
 * Corre solo antes de `npm run build` (`prebuild`), así que un despliegue nunca
 * arrastra un manifiesto viejo.
 */

import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { demoOrders } from '../src/features/demo/board';
import { isPhotoFile, missingFor } from '../src/features/vehicles/services/photos';

const FOLDER = join(process.cwd(), 'public', 'fotos-de-carros');
const TARGET = join(process.cwd(), 'src', 'features', 'vehicles', 'services', 'manifest.ts');
const BRAND_FOLDER = join(process.cwd(), 'public', 'marca');
const BRAND_TARGET = join(process.cwd(), 'src', 'features', 'brand', 'services', 'manifest.ts');
/** Por orden de preferencia: vectorial primero, que escala sin pixelarse. */
const BRAND_NAMES = [
  'romero-motors.svg',
  'romero-motors.webp',
  'romero-motors.png',
  'romero-motors.jpg',
] as const;
/* El logotipo es rojo sobre NEGRO: sobre fondo oscuro la «O» final y «MOTORS»
   desaparecen. Por eso hay dos archivos y no uno. */
const BRAND_DARK_NAMES = [
  'romero-motors-claro.svg',
  'romero-motors-claro.webp',
  'romero-motors-claro.png',
] as const;
const DIANA_NAMES = [
  'diana.svg',
  'diana.webp',
  'diana.png',
  'logo-diana.png',
] as const;

/**
 * ¿La imagen tiene canal alfa?
 *
 * Se lee de la CABECERA del archivo, no con una biblioteca de imágenes: este
 * script corre en `prebuild`, también en el despliegue, y meter `sharp` como
 * dependencia de compilación por un bit de una cabecera no sale a cuenta.
 *
 * Importa porque decide cómo se encaja la foto. Un recorte sin fondo se encaja
 * ENTERO —el hueco lo rellena el color de la tarjeta—, mientras que una foto
 * de estudio con su propio fondo se recorta para llenar el hueco. Aplicar la
 * regla equivocada se ve enseguida: el recorte sale con medio coche fuera de
 * cuadro, y la foto de estudio, con dos franjas vacías a los lados.
 */
function hasAlpha(file: string): boolean {
  let head: Buffer;
  try {
    head = readFileSync(file).subarray(0, 40);
  } catch {
    return false;
  }

  // PNG: el tipo de color va en el byte 25 del IHDR. 4 = gris+alfa, 6 = RGBA.
  if (head.length > 25 && head.toString('binary', 1, 4) === 'PNG') {
    const colourType = head[25];
    return colourType === 4 || colourType === 6;
  }

  if (head.length > 24 && head.toString('ascii', 0, 4) === 'RIFF' && head.toString('ascii', 8, 12) === 'WEBP') {
    const chunk = head.toString('ascii', 12, 16);
    // Extendido: bit 0x10 de los indicadores.
    if (chunk === 'VP8X') return ((head[20] ?? 0) & 0x10) !== 0;
    /* Sin pérdida: tras la firma 0x2F vienen 14 bits de ancho, 14 de alto y
       entonces el bit de alfa — el bit 28 del entero de 32 bits siguiente. */
    if (chunk === 'VP8L') {
      const bits = head.readUInt32LE(21);
      return ((bits >> 28) & 1) === 1;
    }
    // VP8 con pérdida y a secas: sin alfa.
    return false;
  }

  /* JPEG nunca lleva alfa. De cualquier otro formato —AVIF, por ejemplo— no
     se afirma nada: se trata como opaco, que es el comportamiento que había
     antes de esto y no rompe ninguna imagen existente. */
  return false;
}

function render(files: readonly string[], cutouts: readonly string[]): string {
  const list =
    files.length === 0
      ? '  /* Vacío: cada vehículo se dibuja. Ver public/fotos-de-carros/README.md. */\n'
      : files.map((f) => `  '${f}',\n`).join('');

  const cutoutList =
    cutouts.length === 0
      ? '  /* Ninguna: todas traen su propio fondo. */\n'
      : cutouts.map((f) => `  '${f}',\n`).join('');

  return `/**
 * GENERADO POR \`npm run fotos\`. No editar a mano.
 *
 * Lista de archivos presentes en \`public/fotos-de-carros/\`. Lo que no está
 * aquí se dibuja con la ilustración vectorial.
 */

export const PHOTO_MANIFEST: readonly string[] = [
${list}];

/**
 * Las que vienen SIN fondo, con canal alfa.
 *
 * Deciden cómo se encaja la imagen: un recorte se muestra entero y el hueco
 * lo rellena el color de la tarjeta; una foto de estudio se recorta para
 * llenarlo. Con la regla cambiada, el recorte sale con medio coche fuera de
 * cuadro.
 */
export const PHOTO_CUTOUTS: readonly string[] = [
${cutoutList}];
`;
}

function writeIfChanged(target: string, next: string, label: string): void {
  let current = '';
  try {
    current = readFileSync(target, 'utf8');
  } catch {
    /* aún no existe */
  }
  if (current === next) {
    console.log(`${label} · sin cambios`);
    return;
  }
  writeFileSync(target, next, 'utf8');
  console.log(`${label} · manifiesto reescrito`);
}

/**
 * El logotipo oficial.
 *
 * Mientras no esté, la aplicación dibuja una reconstrucción. No es lo mismo y
 * el código lo dice: las letras son la tipográfica del sistema, no los trazos
 * originales.
 */
function firstPresent(folder: string, names: readonly string[]): string | null {
  let present: readonly string[] = [];
  try {
    present = readdirSync(folder);
  } catch {
    // Carpeta ausente: se dibuja la reconstrucción, que es la verdad.
    return null;
  }
  return names.find((name) => present.includes(name)) ?? null;
}

/**
 * Los dos logotipos.
 *
 * Mientras no estén, la aplicación dibuja reconstrucciones. No es lo mismo y
 * el código lo dice: las letras son la tipográfica del sistema, no los trazos
 * originales.
 */
function brand(): void {
  const romero = firstPresent(BRAND_FOLDER, BRAND_NAMES);
  const romeroClaro = firstPresent(BRAND_FOLDER, BRAND_DARK_NAMES);
  const diana = firstPresent(BRAND_FOLDER, DIANA_NAMES);
  const ref = (found: string | null): string => (found === null ? 'null' : `'/marca/${found}'`);

  writeIfChanged(
    BRAND_TARGET,
    `/**
 * GENERADO POR \`npm run assets\`. No editar a mano.
 *
 * Rutas de los logotipos oficiales si alguien los dejó en \`public/marca/\`;
 * \`null\` si todavía no están y hay que dibujar la reconstrucción.
 */

export const OFFICIAL_LOGO: string | null = ${ref(romero)};
/** Variante para fondo oscuro. Si falta, se usa la normal. */
export const OFFICIAL_LOGO_DARK: string | null = ${ref(romeroClaro)};
export const OFFICIAL_DIANA: string | null = ${ref(diana)};
`,
    'marca',
  );

  for (const [nombre, found] of [
    ['Romero Motors', romero],
    ['Romero Motors (claro)', romeroClaro],
    ['DIANA', diana],
  ] as const) {
    console.log(
      found === null
        ? `  · ${nombre}: sin archivo oficial, se dibuja la reconstrucción`
        : `  ✓ ${nombre}: ${found}`,
    );
  }
}

function main(): void {
  let entries: readonly string[] = [];
  try {
    entries = readdirSync(FOLDER);
  } catch {
    // Carpeta borrada: el manifiesto queda vacío, que es la verdad.
  }

  const files = entries.filter(isPhotoFile).sort();
  const cutouts = files.filter((f) => hasAlpha(join(FOLDER, f)));
  const next = render(files, cutouts);

  let current = '';
  try {
    current = readFileSync(TARGET, 'utf8');
  } catch {
    /* aún no existe */
  }

  if (current === next) {
    console.log(`fotos · sin cambios (${String(files.length)} en la carpeta)`);
  } else {
    writeFileSync(TARGET, next, 'utf8');
    console.log(
      `fotos · manifiesto reescrito con ${String(files.length)} archivo(s), ` +
        `${String(cutouts.length)} sin fondo`,
    );
  }

  for (const file of files) console.log(`  ✓ ${file}`);

  // Qué le falta a la flota de la demostración. No es un error —se puede subir
  // de a una— pero sí es lo que uno quiere saber después de copiar archivos.
  const fleet = [...new Set(demoOrders(new Date()).map((o) => o.vehicle))];
  const missing = missingFor(files, fleet);

  if (missing.length === 0) {
    console.log('fotos · la flota de demostración está completa.');
    return;
  }

  console.log(`fotos · faltan ${String(missing.length)} de ${String(fleet.length)}:`);
  for (const { vehicle, expected } of missing) {
    console.log(`  · ${vehicle.padEnd(20)} → ${expected}`);
  }
}

main();
brand();
