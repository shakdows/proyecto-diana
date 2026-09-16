'use client';

import Link from 'next/link';
import { ArrowLeft, ArrowRight, Camera, Check, TriangleAlert } from 'lucide-react';
import { PhotoCapture } from '@/components/evidence/photo-capture';
import { coverageOf, coveragePhrase, isDocumented } from '@/features/evidence/services/coverage';
import { usePhotoCount } from '@/features/evidence/use-photo-count';
import { ZONES, type DamageMark } from '@/features/reception/services/damage-map';
import { usePersistentState } from '@/lib/demo/store';
import { cn } from '@/lib/utils/cn';
import {
  damageSlot,
  partPhotoAnchor,
} from '@/features/reception/services/slots';

/**
 * Paso 5 — la evidencia del ingreso.
 *
 * Son las fotos de CÓMO LLEGÓ el vehículo, y su valor entero está en la
 * fecha: cuando el cliente vuelve diciendo «ese golpe no estaba», lo que se
 * mira es esto. Los daños puntuales ya tienen su foto por zona en el paso
 * anterior; aquí va la vuelta completa, que es lo que enseña el estado
 * general y el contexto de esos daños.
 *
 * ── Por qué estas seis y no «las que sean» ─────────────────────────────────
 *
 * Porque una vuelta al vehículo tiene ángulos fijos, y decir cuáles convierte
 * una tarea vaga —«saca fotos»— en una lista que se puede terminar. Sin la
 * lista, el asesor con prisa saca una de frente y se va.
 */
const TOMAS: readonly { id: string; label: string; hint: string }[] = [
  { id: 'frontal', label: 'Frontal', hint: 'De frente, con la placa legible.' },
  { id: 'trasera', label: 'Trasera', hint: 'De atrás, con la placa legible.' },
  { id: 'lateral-izquierdo', label: 'Lateral izquierdo', hint: 'El costado completo.' },
  { id: 'lateral-derecho', label: 'Lateral derecho', hint: 'El costado completo.' },
  { id: 'tablero', label: 'Tablero', hint: 'Kilometraje y testigos encendidos.' },
  { id: 'interior', label: 'Interior', hint: 'Asientos y objetos que se quedan dentro.' },
];

export function ReceptionEvidence({
  vehicle,
  plate,
}: {
  readonly vehicle: string;
  readonly plate: string;
}) {
  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-semibold tracking-tight text-fg lg:text-[1.75rem]">
            Evidencia del ingreso
          </h1>
          <p className="mt-1 text-sm text-fg-muted">
            {vehicle} · <span data-numeric>{plate}</span>
          </p>
        </div>
        <p data-numeric className="text-sm text-fg-subtle">
          Paso 5 de 7
        </p>
      </header>

      <section className="rounded-panel border border-border bg-surface-raised p-5">
        <p className="flex items-start gap-2.5 text-sm text-fg-muted">
          <Camera aria-hidden className="mt-0.5 size-4 shrink-0 text-fg-subtle" />
          <span>
            <span className="font-semibold text-fg">Da una vuelta al vehículo.</span> Estas fotos
            son la prueba de en qué estado llegó: cuando alguien diga «ese golpe no estaba», lo
            que se mira es esto. En el móvil o la tablet se abre la cámara; en una computadora,
            el visor de la webcam o un archivo.
          </span>
        </p>
      </section>

      <Cobertura plate={plate} />

      <div className="grid gap-4 lg:grid-cols-2">
        {TOMAS.map((toma) => (
          <section key={toma.id} className="rounded-panel border border-border bg-surface-raised p-5">
            <h2 className="font-display text-base font-semibold tracking-tight text-fg">
              {toma.label}
            </h2>
            <p className="mt-0.5 text-xs text-fg-subtle">{toma.hint}</p>
            <div className="mt-4">
              <PhotoCapture anchor={`recepcion:${plate}:${toma.id}`} title={`${toma.label} · ${plate}`} />
            </div>
          </section>
        ))}
      </div>

      <section className="sticky bottom-0 -mx-4 flex flex-wrap items-center justify-between gap-3 border-t border-border bg-surface/95 px-4 py-3 backdrop-blur lg:-mx-6 lg:px-6">
        <p className="text-xs text-fg-subtle">Las fotos se guardan solas al tomarlas.</p>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/recepcion/nueva/checklist"
            className="inline-flex h-11 items-center gap-2 rounded-control border border-border-strong bg-surface-raised px-4 text-sm font-medium text-fg transition-colors duration-150 hover:bg-surface-sunken"
          >
            <ArrowLeft aria-hidden className="size-4" />
            Anterior
          </Link>
          {/*
            Firma y Confirmación todavía no tienen pantalla. El botón lo DICE
            en vez de llevar a un 404 o, peor, no hacer nada: un botón muerto
            en el último paso es exactamente lo que hizo dudar de toda la
            recepción la vez anterior.
          */}
          <Link
            href="/recepcion/nueva/firma"
            className={cn(
              'inline-flex h-11 items-center gap-2 rounded-control px-4 text-sm font-semibold',
              'bg-brand-600 text-white transition-colors duration-150 hover:bg-brand-700',
              'active:scale-[0.98]',
            )}
          >
            Continuar a firma
            <ArrowRight aria-hidden className="size-4" />
          </Link>
        </div>
      </section>
    </>
  );
}

/**
 * Qué falta por documentar, contando las dos clases de foto.
 *
 * ── Por qué las dos siguen existiendo ──────────────────────────────────────
 *
 * Porque prueban cosas distintas. La foto de una zona prueba UN daño: sin
 * ella, «rayón en la aleta trasera derecha» es una letra en un dibujo. La
 * vuelta completa prueba el ESTADO GENERAL, que es lo que cubre justo donde
 * nadie marcó nada —y ahí es donde aparecen las reclamaciones, en el golpe
 * que el asesor no vio—.
 *
 * Quitar cualquiera de las dos deja un hueco. Sin la de zona: ocho daños
 * marcados y seis fotos generales, y nadie sabe cuál prueba cuál. Sin la
 * vuelta: solo hay prueba de lo que alguien se acordó de marcar.
 *
 * Así que no compiten: se CUENTAN aquí. Este bloque es lo que convierte dos
 * listas sueltas en una sola tarea que se puede terminar, y lo que hace que
 * ninguna de las dos parezca de más.
 *
 * Y NO BLOQUEA. Un daño sin foto puede tener su razón —la zona no se ve, el
 * cliente tiene prisa—, y parar la recepción por una foto deja el vehículo en
 * el patio sin orden, que es peor. Se avisa, se cuenta y se decide.
 */
function Cobertura({ plate }: { readonly plate: string }) {
  const [marks] = usePersistentState<readonly DamageMark[]>(damageSlot(plate), SIN_DANOS);

  /* Un hook por zona marcada y por toma: son catorce y seis como mucho, y
     leerlos así mantiene la cuenta viva sin volver a montar la pantalla. */
  const zonas = ZONES.map((zone) => ({
    id: zone.id,
    label: zone.label,
    marcada: marks.some((m) => m.zone === zone.id),
    // eslint-disable-next-line react-hooks/rules-of-hooks -- ZONES es una constante: el número de llamadas no cambia entre renders
    photos: usePhotoCount(partPhotoAnchor(plate, zone.id)),
  }));
  // eslint-disable-next-line react-hooks/rules-of-hooks -- TOMAS es una constante: el número de llamadas no cambia entre renders
  const tomas = TOMAS.map((t) => usePhotoCount(`recepcion:${plate}:${t.id}`));

  const cobertura = coverageOf(
    zonas.filter((z) => z.marcada).map(({ id, label, photos }) => ({ id, label, photos })),
    tomas,
  );
  const listo = isDocumented(cobertura);

  return (
    <section
      className={cn(
        'rounded-panel border px-5 py-4',
        listo ? 'border-ok-500/40 bg-ok-100' : 'border-border bg-surface-raised',
      )}
    >
      <p className="flex flex-wrap items-center gap-2 text-sm">
        {listo ? (
          <Check aria-hidden className="size-4 shrink-0 text-ok-600" />
        ) : (
          <TriangleAlert aria-hidden className="size-4 shrink-0 text-fg-subtle" />
        )}
        <span className={cn('font-semibold', listo ? 'text-ok-700' : 'text-fg')}>
          {listo ? 'Evidencia completa' : 'Evidencia del ingreso'}
        </span>
        <span className={listo ? 'text-ok-700/85' : 'text-fg-muted'}>
          {coveragePhrase(cobertura)}
        </span>
      </p>

      {cobertura.missing.length > 0 && (
        <p className="mt-2 text-xs text-fg-muted">
          Sin foto:{' '}
          <span className="font-medium text-fg">
            {cobertura.missing.map((m) => m.label.toLowerCase()).join(', ')}
          </span>
          .{' '}
          <Link
            href="/recepcion/nueva/checklist"
            className="font-medium text-brand-700 underline-offset-4 hover:underline"
          >
            Volver a los daños
          </Link>{' '}
          para completarlas. No bloquea la recepción.
        </p>
      )}
    </section>
  );
}

const SIN_DANOS: readonly DamageMark[] = [];
