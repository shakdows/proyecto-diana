/**
 * Prepara las siete fotografías de los módulos: `public/assets/admin/*.webp`.
 *
 * NO se ejecuta en el `build`. Es un paso de arte que se corre a mano —
 * `node scripts/admin-modules.mjs`— cuando llegan entregas nuevas.
 *
 * Hace dos cosas, y las dos hacen falta:
 *
 * 1. RECORTA EL MARCO. Las entregas vienen con la tarjeta ya dibujada sobre un
 *    fondo gris, con su margen y sus esquinas redondeadas. Puestas tal cual
 *    sobre la crema de la pantalla, ese gris se ve como un segundo marco
 *    alrededor del primero. Se recorta hasta el borde de la tarjeta y el radio
 *    lo pone el componente, que es quien sabe a qué tamaño se dibuja.
 *
 * 2. CONVIERTE A WEBP. Los originales pesan 1,7 MB cada uno: doce megas de
 *    PNG en la pantalla que un jefe de taller abre veinte veces al día. A
 *    calidad 82 son unos cien kilobytes y no se distingue la diferencia.
 *
 * El nombre del archivo ES el contrato con el código: `moduleImage()` en
 * `features/dashboard/services/modules.ts` compone la ruta a partir del
 * identificador del módulo, y una prueba comprueba que los siete existan.
 */

import { createRequire } from 'node:module';
import { readdirSync } from 'node:fs';

const require = createRequire(import.meta.url);
const sharp = require('sharp');

const SOURCE_DIR = 'fotos/pantalla inicio';
const OUT_DIR = 'public/assets/admin';

/**
 * Qué es cada entrega, en el orden en que ChatGPT las numeró.
 *
 * Va escrito a mano porque no hay forma de deducirlo: los archivos se llaman
 * «ChatGPT Image … (3).png» y lo único que los distingue es lo que se ve.
 */
const ORDER = [
  'recepcion',
  'taller',
  'clientes',
  'ordenes',
  'compras',
  'reportes',
  'configuracion',
];

/** Margen gris que traen las entregas alrededor de la tarjeta, en píxeles. */
const FRAME = 56;
/** Ancho de salida. La tarjeta más grande se dibuja a ~340 px; 900 cubre 2×. */
const WIDTH = 900;

const files = readdirSync(SOURCE_DIR)
  .filter((f) => f.toLowerCase().endsWith('.png'))
  .sort();

if (files.length !== ORDER.length) {
  throw new Error(
    `Se esperaban ${String(ORDER.length)} entregas en «${SOURCE_DIR}» y hay ${String(files.length)}.`,
  );
}

for (const [index, file] of files.entries()) {
  const name = ORDER[index];
  const meta = await sharp(`${SOURCE_DIR}/${file}`).metadata();

  const out = await sharp(`${SOURCE_DIR}/${file}`)
    .extract({
      left: FRAME,
      top: FRAME,
      width: (meta.width ?? 0) - FRAME * 2,
      height: (meta.height ?? 0) - FRAME * 2,
    })
    .resize({ width: WIDTH })
    .webp({ quality: 82 })
    .toFile(`${OUT_DIR}/${name}.webp`);

  console.log(
    `${name.padEnd(14)} ${out.width}x${out.height}  ${String(Math.round(out.size / 1024)).padStart(4)} kB`,
  );
}
