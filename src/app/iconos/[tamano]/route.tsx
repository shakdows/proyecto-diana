import { ImageResponse } from 'next/og';
import { MARK_BG, RomeroMark } from '@/features/brand/mark';

/**
 * El icono de la aplicación instalada, en PNG y al tamaño que pidan.
 *
 * ── Por qué generado y no un archivo ───────────────────────────────────────
 *
 * Porque hacen falta VARIOS tamaños —180 para iOS, 192 para Android, 512 para
 * la pantalla de arranque— y mantener tres PNG a mano significa que el día que
 * cambie la marca se actualizan dos. Aquí el dibujo es el MISMO componente que
 * pinta la pestaña (`features/brand/mark.tsx`), así que no pueden divergir.
 *
 * `next/og` viene con Next: no añade ninguna dependencia.
 *
 * ── Por qué con margen ─────────────────────────────────────────────────────
 *
 * Android recorta los iconos a la forma que tenga el lanzador —círculo, gota,
 * cuadrado redondeado— y se come hasta el 20 % del borde. El dibujo se queda
 * dentro del 72 % central, que es lo que la especificación llama zona segura:
 * sin eso, la R aparece mordida en la mitad de los teléfonos.
 */

export const dynamic = 'force-static';

const TAMANOS = [180, 192, 512] as const;

export function generateStaticParams(): { tamano: string }[] {
  return TAMANOS.map((t) => ({ tamano: String(t) }));
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ tamano: string }> },
): Promise<ImageResponse | Response> {
  const { tamano } = await params;
  const size = Number(tamano);

  if (!TAMANOS.includes(size as (typeof TAMANOS)[number])) {
    return new Response('Tamaño no disponible', { status: 404 });
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: size,
          height: size,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          /* El fondo llega a los bordes; el margen lo da el dibujo de dentro,
             que es lo que el recorte de Android no puede morder. */
          background: MARK_BG,
        }}
      >
        <RomeroMark size={Math.round(size * 0.72)} />
      </div>
    ),
    { width: size, height: size },
  );
}
