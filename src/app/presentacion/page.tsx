import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Boxes, Car, Wrench } from 'lucide-react';
import type { ReactNode } from 'react';
import { RomeroWordmark } from '@/components/brand/romero-logo';
import { DotPattern } from '@/components/brand/surfaces';
import { VehicleArt } from '@/components/art/vehicle-art';

export const metadata: Metadata = {
  title: { absolute: 'Romero Motors · Más que un taller' },
  description:
    'Servicio de taller con seguimiento en tiempo real: sabes en qué punto está tu vehículo y qué se le hizo, sin llamar a preguntar.',
};

/**
 * Portada.
 *
 * Habla con el CLIENTE del taller, no con quien evalúa el sistema. Tres
 * respuestas y nada más: qué es esto, qué puedo hacer, por dónde entro.
 *
 * La explicación técnica —cómo se miden los tiempos, por qué el cliente
 * aprueba línea por línea, cómo aísla la base de datos— no desapareció: vive
 * en `/presentacion/sistema`, que es donde la busca quien la busca. Mezclarla
 * aquí obligaba al cliente que solo quiere saber si su camioneta está lista a
 * pasar por encima de una explicación de políticas de PostgreSQL.
 *
 * ── El rojo ──────────────────────────────────────────────────────────────
 *
 * Aquí manda el rojo de Romero Motors, y adentro manda el azul. No es
 * incoherencia: en la aplicación el rojo significa «retrasado, parado,
 * crítico» y tiene que poder gritar. En esta página no hay ninguna alarma con
 * la que competir, así que el color de la empresa es libre de ser el
 * protagonista.
 */
export default function PortadaPage() {
  return (
    <div className="min-h-dvh bg-graphite-950 text-graphite-200">
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-6 lg:px-8">
        <RomeroWordmark on="dark" className="h-11 w-auto text-white" />
        <Link
          href="/login"
          className="shrink-0 rounded-control border border-graphite-700 px-4 py-2.5 text-sm font-medium text-graphite-100 transition-colors duration-150 hover:border-graphite-500 hover:text-white"
        >
          Entrar
        </Link>
      </header>

      <main>
        <section className="relative isolate overflow-hidden">
          <DotPattern className="text-white/[0.06]" />
          <span
            aria-hidden
            className="pointer-events-none absolute -right-40 -top-32 size-[34rem] rounded-full bg-romero-600/20 blur-3xl"
          />

          <div className="relative mx-auto grid max-w-6xl gap-10 px-5 pb-16 pt-10 lg:grid-cols-[1fr_auto] lg:items-center lg:px-8 lg:pb-24 lg:pt-16">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.28em] text-graphite-400">
                Servicio · Confianza · Movimiento
              </p>

              <h1 className="mt-5 max-w-[13ch] font-display text-4xl font-semibold leading-[1.06] tracking-tight text-white sm:max-w-none sm:text-5xl lg:text-[3.25rem]">
                Tu vehículo,
                <br />
                en las <span className="text-romero-500">mejores manos</span>.
              </h1>

              <p className="mt-5 max-w-lg text-lg leading-relaxed text-graphite-300">
                Cuidamos tu camino para que llegues más lejos. Desde que lo dejas hasta que te
                lo llevas, sabes en qué punto está sin llamar a preguntar.
              </p>

              <div className="mt-9 flex flex-wrap gap-3">
                <Link
                  href="/login"
                  className="inline-flex h-12 items-center gap-2 rounded-control bg-romero-500 px-6 text-sm font-semibold text-white transition-colors duration-150 hover:bg-romero-600"
                >
                  Agendar servicio
                  <ArrowRight aria-hidden className="size-4" />
                </Link>
                <Link
                  href="/presentacion/sistema"
                  className="inline-flex h-12 items-center rounded-control border border-graphite-700 px-6 text-sm font-medium text-graphite-100 transition-colors duration-150 hover:border-graphite-500 hover:text-white"
                >
                  Cómo funciona
                </Link>
              </div>
            </div>

            {/* Sin fotografía todavía: la silueta ocupa su sitio y su recorte.
                El día que entre `public/fondos/hero-taller.jpg` se cambia aquí
                y nada más se mueve. */}
            <span
              aria-hidden
              /* Atenuada a propósito. A pleno color el dibujo pesa más que el
                 titular, y es un marcador de posición: no debe ser lo primero
                 que se mira en la portada. */
              className="hidden w-[24rem] opacity-25 grayscale lg:block xl:w-[30rem]"
            >
              <VehicleArt vehicle="Toyota Hilux" kind="vehiculo" fit="contain" />
            </span>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 pb-20 lg:px-8">
          <ul className="grid gap-4 sm:grid-cols-3">
            <Card
              icon={<Wrench />}
              title="Taller"
              hint="Servicio profesional"
              href="/presentacion/sistema"
            />
            <Card
              icon={<Car />}
              title="Vehículos"
              hint="Listos para tu próximo destino"
              href="/presentacion/sistema"
            />
            <Card
              icon={<Boxes />}
              title="Repuestos"
              hint="Siempre disponibles"
              href="/presentacion/sistema"
            />
          </ul>
        </section>
      </main>

      <footer className="border-t border-graphite-800">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-7 lg:px-8">
          <p className="text-sm italic text-graphite-400">
            «Más que un taller, tu aliado en el camino.»
          </p>
          <p className="text-xs uppercase tracking-[0.22em] text-graphite-500">Romero Motors</p>
        </div>
      </footer>
    </div>
  );
}

function Card({
  icon,
  title,
  hint,
  href,
}: {
  readonly icon: ReactNode;
  readonly title: string;
  readonly hint: string;
  readonly href: string;
}) {
  return (
    <li>
      <Link
        href={href}
        className="flex h-full items-center gap-4 rounded-panel border border-graphite-800 bg-graphite-900 px-5 py-5 transition-colors duration-150 hover:border-graphite-600"
      >
        <span
          aria-hidden
          className="grid size-11 shrink-0 place-items-center rounded-control bg-romero-500/10 text-romero-500 [&>svg]:size-5"
        >
          {icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-display text-base font-semibold text-white">{title}</span>
          <span className="mt-0.5 block truncate text-sm text-graphite-400">{hint}</span>
        </span>
        <ArrowRight aria-hidden className="size-4 shrink-0 text-graphite-500" />
      </Link>
    </li>
  );
}
