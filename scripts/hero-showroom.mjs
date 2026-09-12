/**
 * Compone la fotografía de la portada: `public/fondos/hero-showroom.webp`.
 *
 * NO se ejecuta en el `build`. Es un paso de arte que se corre a mano —
 * `node scripts/hero-showroom.mjs`— cuando cambian las piezas de origen.
 *
 * Existe porque la imagen no es una fotografía: son dos archivos montados.
 * Sin esta receta, dentro de seis meses nadie sabría de dónde salió ni cómo
 * rehacerla, y la única salida sería volver a pedir el original.
 *
 * Piezas, las dos en `fotos/`:
 *
 *   · el vestíbulo, con el rótulo, el lema y la lista de conceptos YA
 *     pintados en la pared y en perspectiva;
 *   · la camioneta recortada, con canal alfa.
 *
 * ── Por qué ya no se dibuja el texto de la pared ──────────────────────────
 *
 * Una versión anterior montaba el lema con SVG sobre un vestíbulo vacío.
 * Funcionaba, pero era texto plano pegado sobre una pared en perspectiva: se
 * notaba. Esta entrega trae la pared rotulada de origen, con la inclinación y
 * la luz correctas, así que el montaje se reduce a poner el vehículo.
 *
 * Lo que sigue FUERA es la banda de conceptos de abajo —«Confianza · en cada
 * kilómetro» y las otras tres—, que la pantalla pinta en HTML. Ahí es mensaje
 * y no decorado: escala, se traduce y lo lee un lector de pantalla. Que los
 * cuatro nombres salgan también en la pared es del diseño de referencia: allí
 * son rótulo de la empresa, aquí son la promesa del producto.
 */

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const sharp = require('sharp');

const LOBBY = 'fotos/ChatGPT Image 12 sept 2026, 12_29_37.png';
const TRUCK = 'fotos/ChatGPT Image 12 sept 2026, 11_52_31.png';
const OUT = 'public/fondos/hero-showroom.webp';

const W = 1536;
const H = 1024;
const TRUCK_W = 980;
const TRUCK_LEFT = 500;
/** Suelo visible bajo las ruedas. Sin él la camioneta toca el borde inferior. */
const FLOOR_GAP = 80;

const base = await sharp(LOBBY)
  .resize({ width: W, height: H, fit: 'cover', position: 'centre' })
  .toBuffer();

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
const shadowH = 110;
const shadow = await sharp(
  Buffer.from(
    `<svg width="${shadowW}" height="${shadowH}">` +
      `<ellipse cx="${shadowW / 2}" cy="${shadowH / 2}" rx="${shadowW / 2 - 10}" ` +
      `ry="${shadowH / 2 - 10}" fill="rgb(0,0,0)" fill-opacity="0.55"/></svg>`,
  ),
)
  .blur(32)
  .png()
  .toBuffer();

const reflectionH = Math.round(tm.height * 0.45);
const fade = await sharp(
  Buffer.from(
    `<svg width="${tm.width}" height="${reflectionH}">` +
      `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">` +
      `<stop offset="0" stop-color="#fff" stop-opacity="0.32"/>` +
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
    { input: shadow, left: TRUCK_LEFT + Math.round((TRUCK_W - shadowW) / 2), top: baseline - 68 },
    { input: reflection, left: TRUCK_LEFT, top: baseline - 6 },
    { input: truck, left: TRUCK_LEFT, top: truckTop },
  ])
  .webp({ quality: 76 })
  .toFile(OUT);

console.log(`${OUT} · ${out.width}x${out.height} · ${Math.round(out.size / 1024)} kB`);
