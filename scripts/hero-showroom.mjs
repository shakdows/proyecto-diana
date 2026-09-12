/**
 * Compone la fotografía de la portada: `public/fondos/hero-showroom.webp`.
 *
 * NO se ejecuta en el `build`. Es un paso de arte que se corre a mano —
 * `node scripts/hero-showroom.mjs`— cuando cambian las piezas de origen.
 *
 * Existe porque la imagen no es una fotografía: son tres archivos montados.
 * Sin esta receta, dentro de seis meses nadie sabría de dónde salió ni cómo
 * rehacerla si cambia el logotipo o la camioneta, y la única salida sería
 * volver a pedir el original.
 *
 * Piezas, todas en `fotos/`:
 *
 *   · el vestíbulo vacío, cálido y sin nada en las paredes;
 *   · la camioneta recortada, con canal alfa;
 *   · el rótulo, que NO sale de `fotos/` sino de `public/marca/`: la copia de
 *     la hoja de recursos mide 202 px de ancho y en la pared se vería borrosa.
 *
 * Lo que NO se monta: los textos. La hoja traía «MÁS QUE UN TALLER…» y los
 * cuatro conceptos dibujados dentro de la imagen; la pantalla los pinta en
 * HTML, donde escalan, se traducen y los lee un lector de pantalla. Montarlos
 * también saldría duplicado.
 */

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const sharp = require('sharp');

const W = 1600;
const H = 1200;
const TRUCK_W = 1020;
const TRUCK_LEFT = 470;
/** Suelo visible bajo las ruedas. Sin él la camioneta toca el borde inferior. */
const FLOOR_GAP = 150;

const LOBBY = 'fotos/ChatGPT Image 12 sept 2026, 11_34_12.png';
const TRUCK = 'fotos/ChatGPT Image 12 sept 2026, 11_52_31.png';
const SIGN = 'public/marca/romero-motors-claro.png';
const OUT = 'public/fondos/hero-showroom.webp';

const base = await sharp(LOBBY)
  .resize({ width: W, height: H, fit: 'cover', position: 'centre' })
  .toBuffer();

const sign = await sharp(SIGN).resize({ width: 430 }).toBuffer();

const truck = await sharp(TRUCK).trim({ threshold: 2 }).resize({ width: TRUCK_W }).toBuffer();
const tm = await sharp(truck).metadata();
const truckTop = H - tm.height - FLOOR_GAP;
const baseline = truckTop + tm.height;

/*
 * Sombra de contacto y reflejo.
 *
 * Un recorte pegado sobre un fondo FLOTA, y se nota antes de saber por qué:
 * no hay sombra donde las ruedas tocan el suelo ni reflejo en un suelo que
 * refleja todo lo demás. Son las dos cosas que convierten dos imágenes en una
 * escena.
 */
const shadowW = Math.round(TRUCK_W * 0.94);
const shadowH = 120;
const shadow = await sharp(
  Buffer.from(
    `<svg width="${shadowW}" height="${shadowH}">` +
      `<ellipse cx="${shadowW / 2}" cy="${shadowH / 2}" rx="${shadowW / 2 - 10}" ` +
      `ry="${shadowH / 2 - 10}" fill="rgb(0,0,0)" fill-opacity="0.55"/></svg>`,
  ),
)
  .blur(34)
  .png()
  .toBuffer();

const reflectionH = Math.round(tm.height * 0.45);
const fade = await sharp(
  Buffer.from(
    `<svg width="${tm.width}" height="${reflectionH}">` +
      `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">` +
      `<stop offset="0" stop-color="#fff" stop-opacity="0.30"/>` +
      `<stop offset="1" stop-color="#fff" stop-opacity="0"/>` +
      `</linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/></svg>`,
  ),
)
  .png()
  .toBuffer();

const reflection = await sharp(truck)
  .flip()
  .extract({ left: 0, top: 0, width: tm.width, height: reflectionH })
  .composite([{ input: fade, blend: 'dest-in' }])
  .blur(3)
  .png()
  .toBuffer();

const out = await sharp(base)
  .composite([
    { input: sign, left: 190, top: 205 },
    { input: shadow, left: TRUCK_LEFT + Math.round((TRUCK_W - shadowW) / 2), top: baseline - 74 },
    { input: reflection, left: TRUCK_LEFT, top: baseline - 6 },
    { input: truck, left: TRUCK_LEFT, top: truckTop },
  ])
  .webp({ quality: 74 })
  .toFile(OUT);

console.log(`${OUT} · ${out.width}x${out.height} · ${Math.round(out.size / 1024)} kB`);
