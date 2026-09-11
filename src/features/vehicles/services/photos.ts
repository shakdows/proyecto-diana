/**
 * Resolución de la fotografía de un vehículo.
 *
 * Las fotos viven en `public/fotos-de-carros/`. Este módulo decide CUÁL le
 * toca a cada vehículo, y es puro para poder probar esa decisión sin tocar el
 * disco: el error típico —una foto que no aparece porque el nombre del archivo
 * no casa con el modelo— es invisible hasta que alguien mira la pantalla.
 */

/** Carpeta pública. Sin espacios ni acentos: es parte de una URL. */
export const PHOTO_DIR = '/fotos-de-carros';

export const PHOTO_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.avif'] as const;

/**
 * «Toyota Hilux SRV» → `toyota-hilux-srv`.
 *
 * Quita acentos antes de filtrar: sin eso, «Citroën» se convertiría en
 * `citro-n` y jamás casaría con `citroen.jpg`.
 */
export function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, '-')
    .replace(/^-+|-+$/gu, '');
}

/** Nombre de archivo esperado, sin extensión, para un modelo dado. */
export function expectedName(vehicle: string): string {
  return slugify(vehicle);
}

/**
 * Busca la foto de un vehículo dentro del manifiesto.
 *
 * Casa por PREFIJO más largo: `toyota-hilux.jpg` sirve para «Toyota Hilux SRV»
 * y para «Toyota Hilux 4x4», que es lo que uno espera al nombrar un archivo.
 * Se prefiere el más específico, de modo que añadir `toyota-hilux-srv.jpg`
 * más adelante gana sobre el genérico sin tocar código.
 *
 * Devuelve `null` si no hay ninguna: quien llama dibuja la ilustración.
 */
export function findPhoto(manifest: readonly string[], vehicle: string): string | null {
  const target = slugify(vehicle);
  if (target === '') return null;

  let best: string | null = null;
  let bestLength = 0;

  for (const entry of manifest) {
    const name = stripExtension(entry);
    if (name === '') continue;
    // Solo casa si el nombre del archivo es un prefijo COMPLETO de segmento:
    // `kia.jpg` sirve para «Kia Sportage», pero `ki.jpg` no.
    if (target !== name && !target.startsWith(`${name}-`)) continue;
    if (name.length > bestLength) {
      best = entry;
      bestLength = name.length;
    }
  }

  return best === null ? null : `${PHOTO_DIR}/${best}`;
}

export function stripExtension(filename: string): string {
  const dot = filename.lastIndexOf('.');
  return dot <= 0 ? filename : filename.slice(0, dot);
}

export function isPhotoFile(filename: string): boolean {
  const lower = filename.toLowerCase();
  return (PHOTO_EXTENSIONS as readonly string[]).some((ext) => lower.endsWith(ext));
}

/** Qué falta por subir, dada una flota y lo que hay en la carpeta. */
export function missingFor(
  manifest: readonly string[],
  fleet: readonly string[],
): readonly { readonly vehicle: string; readonly expected: string }[] {
  return fleet
    .filter((v) => findPhoto(manifest, v) === null)
    .map((v) => ({ vehicle: v, expected: `${expectedName(v)}.jpg` }));
}
