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
 * ── Qué texto va dentro de la imagen y cuál no ────────────────────────────
 *
 * DENTRO va el que está PINTADO EN LA PARED: el lema de la empresa, justo
 * bajo el rótulo. Es parte de la escena: dibujarlo en HTML lo haría flotar
 * sobre la fotografía en vez de pertenecer a ella, y se movería con cada
 * recorte.
 *
 * FUERA se queda la banda de conceptos —«Confianza · en cada kilómetro» y las
 * otras tres—, que la pantalla pinta en HTML. Ahí es mensaje y no decorado:
 * escala, se traduce y lo lee un lector de pantalla.
 *
 * La hoja de referencia llevaba además una lista vertical en la pared con esos
 * mismos cuatro conceptos. NO se monta, por dos razones que apuntan al mismo
 * sitio: decía exactamente lo que ya dice la banda de abajo, y caía justo
 * donde el titular se apoya. La lista y el titular se pisaban, y no hay
 * posición que lo arregle en todas las alturas de pantalla —el titular está
 * anclado abajo y la pared no se mueve con él—. La pared se queda con lo que
 * no compite: el nombre y la promesa.
 *
 * El texto de la pared se dibuja con SVG y una tipográfica del sistema, no se
 * escala desde la hoja de recursos: la copia de la hoja mide 174 px de ancho
 * y a tamaño de pared se vería como una mancha.
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

/* Más grande y más arriba: es lo primero que se lee de la escena y antes
   competía de tú a tú con el lema que lleva debajo. */
const sign = await sharp(SIGN).resize({ width: 500 }).toBuffer();

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

/* ------------------------------------------------------------------ *
 * Lo que está pintado en la pared
 * ------------------------------------------------------------------ */

const WALL_X = 195;
const WALL_FONT = 'Liberation Sans, DejaVu Sans, sans-serif';

/** Gris claro y no blanco: la pared está en penumbra y el blanco puro salta. */
const WALL_INK = '#dcdcdc';

const wallText = await sharp(
  Buffer.from(
    `<svg width="520" height="120" xmlns="http://www.w3.org/2000/svg">
       <text x="0" y="40" font-family="${WALL_FONT}" font-size="34" letter-spacing="3"
             fill="${WALL_INK}">MÁS QUE UN TALLER,</text>
       <text x="0" y="86" font-family="${WALL_FONT}" font-size="34" letter-spacing="3"
             fill="${WALL_INK}">TU ALIADO EN EL CAMINO</text>
     </svg>`,
  ),
)
  /* Un punto de desenfoque: está pintado sobre una pared, no impreso sobre la
     imagen. Sin él, el texto queda más nítido que el rótulo que tiene encima
     y se lee como una pegatina. */
  .blur(0.4)
  .png()
  .toBuffer();

const out = await sharp(base)
  .composite([
    /* Alto, en el tercio superior de la pared. Lo pintado no se mueve con la
       pantalla y el bloque de texto de la portada está anclado ABAJO: cuanto
       más baja es la ventana, más sube ese bloque. A 800 px el filete rojo del
       titular cruzaba «TU ALIADO EN EL CAMINO». Subir la pintura es lo único
       que lo resuelve a todas las alturas a la vez. */
    { input: sign, left: 190, top: 95 },
    { input: wallText, left: WALL_X, top: 296 },
    { input: shadow, left: TRUCK_LEFT + Math.round((TRUCK_W - shadowW) / 2), top: baseline - 74 },
    { input: reflection, left: TRUCK_LEFT, top: baseline - 6 },
    { input: truck, left: TRUCK_LEFT, top: truckTop },
  ])
  .webp({ quality: 74 })
  .toFile(OUT);

console.log(`${OUT} · ${out.width}x${out.height} · ${Math.round(out.size / 1024)} kB`);
