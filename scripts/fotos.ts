/**
 * Lee `public/fotos-de-carros/` y reescribe el manifiesto que consume la
 * aplicación.
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

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { demoOrders } from '../src/features/demo/board';
import { isPhotoFile, missingFor } from '../src/features/vehicles/services/photos';

const FOLDER = join(process.cwd(), 'public', 'fotos-de-carros');
const TARGET = join(process.cwd(), 'src', 'features', 'vehicles', 'services', 'manifest.ts');

function render(files: readonly string[]): string {
  const list =
    files.length === 0
      ? '  /* Vacío: cada vehículo se dibuja. Ver public/fotos-de-carros/README.md. */\n'
      : files.map((f) => `  '${f}',\n`).join('');

  return `/**
 * GENERADO POR \`npm run fotos\`. No editar a mano.
 *
 * Lista de archivos presentes en \`public/fotos-de-carros/\`. Lo que no está
 * aquí se dibuja con la ilustración vectorial.
 */

export const PHOTO_MANIFEST: readonly string[] = [
${list}];
`;
}

function main(): void {
  let entries: readonly string[] = [];
  try {
    entries = readdirSync(FOLDER);
  } catch {
    // Carpeta borrada: el manifiesto queda vacío, que es la verdad.
  }

  const files = entries.filter(isPhotoFile).sort();
  const next = render(files);

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
    console.log(`fotos · manifiesto reescrito con ${String(files.length)} archivo(s)`);
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
