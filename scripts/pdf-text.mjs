/**
 * Extractor de texto de los PDF de @react-pdf/renderer.
 *
 *   node scripts/pdf-text.mjs documento.pdf
 *
 * Existe para poder comprobar QUÉ DICE un PDF generado sin abrirlo a mano.
 * Sirvió para verificar que la cotización imprime exactamente los mismos
 * importes que la pantalla, y que el informe corporativo imprime el mismo NPS
 * que el panel. Un PDF que cuadra "a ojo" no cuadra.
 *
 * El texto viaja en arrays TJ con cadenas HEXADECIMALES de códigos de glifo.
 * Con Helvetica incorporada esos códigos coinciden con WinAnsi, así que
 * decodificarlos como latin1 devuelve el texto. No es un lector de PDF
 * completo; basta para comprobar QUÉ dice el documento.
 */
import { readFile } from 'node:fs/promises';
import { inflateSync } from 'node:zlib';

/*
 * WinAnsiEncoding NO es latin1 en el rango 0x80-0x9F: ahí latin1 tiene
 * controles y WinAnsi tiene comillas tipográficas, guiones y el euro.
 * Sin esta tabla, un guion largo (0x97) desaparece del texto extraído y
 * parece un fallo del PDF cuando el fallo es del lector.
 */
const WINANSI_HIGH = {
  0x80: '€', 0x82: '‚', 0x83: 'ƒ', 0x84: '„', 0x85: '…', 0x86: '†', 0x87: '‡',
  0x88: 'ˆ', 0x89: '‰', 0x8a: 'Š', 0x8b: '‹', 0x8c: 'Œ', 0x8e: 'Ž', 0x91: '‘',
  0x92: '’', 0x93: '“', 0x94: '”', 0x95: '•', 0x96: '–', 0x97: '—', 0x98: '˜',
  0x99: '™', 0x9a: 'š', 0x9b: '›', 0x9c: 'œ', 0x9e: 'ž', 0x9f: 'Ÿ',
};

const decodeWinAnsi = (hex) =>
  [...Buffer.from(hex, 'hex')]
    .map((byte) => WINANSI_HIGH[byte] ?? String.fromCharCode(byte))
    .join('');

const buf = await readFile(process.argv[2]);
const raw = buf.toString('latin1');

const streams = [];
let p = -1;
while ((p = raw.indexOf('stream', p + 1)) !== -1) {
  if (raw.slice(p - 3, p) === 'end') continue;
  let a = p + 6;
  if (buf[a] === 0x0d) a += 1;
  if (buf[a] === 0x0a) a += 1;
  const e = raw.indexOf('endstream', a);
  try {
    streams.push(inflateSync(buf.subarray(a, e)).toString('latin1'));
  } catch { /* no todo stream es texto */ }
}

const piezas = [];
for (const content of streams) {
  for (const m of content.matchAll(/\[((?:<[0-9a-fA-F]*>|\((?:\\.|[^\\)])*\)|[^\]])*)\]\s*TJ/g)) {
    let texto = '';
    for (const g of m[1].matchAll(/<([0-9a-fA-F]*)>|\(((?:\\.|[^\\)])*)\)/g)) {
      if (g[1] !== undefined) {
        texto += decodeWinAnsi(g[1]);
      } else {
        texto += (g[2] ?? '').replace(/\\([()\\])/g, '$1');
      }
    }
    if (texto.trim() !== '') piezas.push(texto);
  }
  for (const m of content.matchAll(/<([0-9a-fA-F]+)>\s*Tj/g)) {
    piezas.push(decodeWinAnsi(m[1]));
  }
}

console.log(piezas.join(' | '));
