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
 * ── Por qué el lienzo es más alto que la fotografía ───────────────────────
 *
 * La columna de la portada es más ALTA que ancha —ronda 1,15 en un monitor y
 * 0,91 en un portátil— y la toma es 1,5. Recortar una cosa dentro de la otra
 * se lleva entre el 20 % y el 49 % del ancho, y eso cortaba el morro de la
 * camioneta.
 *
 * La solución no es mover el encuadre —a la izquierda está el rótulo y no se
 * puede sacrificar—: es alargar el suelo. Se estira la franja inferior, que es
 * mármol pulido con reflejos verticales y se alarga sin delatarse, hasta que
 * el lienzo llega a 1,15. A esa proporción, en el monitor donde se usa esto no
 * hay recorte: se ve la escena entera.
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
/** Alto de la toma original, antes de alargar el suelo. */
const PHOTO_H = 1024;
/** Suelo añadido, hasta llegar a la proporción de la columna (~1,15). */
const FLOOR_EXTRA = 316;
const H = PHOTO_H + FLOOR_EXTRA;

const TRUCK_W = 880;
const TRUCK_LEFT = 440;
/** La camioneta pisa el suelo ORIGINAL, no el alargado. */
const TRUCK_BASELINE = PHOTO_H - 30;

const photo = await sharp(LOBBY)
  .resize({ width: W, height: PHOTO_H, fit: 'cover', position: 'centre' })
  .toBuffer();

/*
 * El suelo alargado.
 *
 * Se toma la franja inferior y se estira. Funciona porque ese suelo es mármol
 * pulido: lo que hay son reflejos verticales, y en perspectiva un reflejo se
 * alarga hacia el espectador. Estirar una pared o un techo se notaría; esto
 * no. Un desenfoque mínimo y un velo que oscurece hacia abajo disimulan la
 * costura y, de paso, asientan el primer plano.
 */
const floor = await sharp(photo)
  .extract({ left: 0, top: PHOTO_H - 150, width: W, height: 150 })
  .resize({ width: W, height: FLOOR_EXTRA, fit: 'fill' })
  .blur(2)
  .toBuffer();

const floorShade = Buffer.from(
  `<svg width="${W}" height="${FLOOR_EXTRA}">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0" stop-color="#05070a" stop-opacity="0"/>` +
    `<stop offset="1" stop-color="#05070a" stop-opacity="0.55"/>` +
    `</linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/></svg>`,
);

const base = await sharp({
  create: { width: W, height: H, channels: 4, background: { r: 5, g: 7, b: 10, alpha: 1 } },
})
  .composite([
    { input: photo, left: 0, top: 0 },
    { input: floor, left: 0, top: PHOTO_H },
    { input: floorShade, left: 0, top: PHOTO_H },
  ])
  .png()
  .toBuffer();

const truck = await sharp(TRUCK).trim({ threshold: 2 }).resize({ width: TRUCK_W }).toBuffer();
const tm = await sharp(truck).metadata();
const baseline = TRUCK_BASELINE;
const truckTop = baseline - tm.height;

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
