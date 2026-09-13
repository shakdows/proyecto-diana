'use client';

import Link from 'next/link';
import { ArrowLeft, ArrowRight, Camera } from 'lucide-react';
import { PhotoCapture } from '@/components/evidence/photo-capture';
import { cn } from '@/lib/utils/cn';

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
          <span
            className={cn(
              'inline-flex h-11 cursor-not-allowed items-center gap-2 rounded-control',
              'bg-surface-sunken px-4 text-sm font-semibold text-fg-subtle',
            )}
            title="La pantalla de firma todavía no está construida."
          >
            Firma · en construcción
            <ArrowRight aria-hidden className="size-4" />
          </span>
        </div>
      </section>
    </>
  );
}
