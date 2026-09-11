import type { Metadata } from 'next';
import Link from 'next/link';
import { clientEnv } from '@/lib/env';

export const metadata: Metadata = {
  title: 'Diana · Gestión de taller automotriz',
  description:
    'Del ingreso del vehículo a la entrega, en una sola orden de servicio. Diagnóstico con evidencia, aprobación del cliente por ítem, compras trazables y tiempos que miden lo que de verdad hizo el taller.',
};

const APP = 'https://proyecto-diana-blue.vercel.app';
const REPO = 'https://github.com/shakdows/proyecto-diana';

/** Las ocho etapas del recorrido, en orden. */
const ETAPAS = [
  'Recepción', 'Diagnóstico', 'Cotización', 'Autorización',
  'Repuestos', 'Reparación', 'Calidad', 'Entrega',
] as const;

/** Los cuatro instantes que explican si un taller cumple o no. */
const MOMENTOS = [
  {
    corte: 'Diagnóstico completado',
    mide: 'Capacidad técnica de responder rápido',
    detalle: 'Desde que el vehículo entra hasta que se sabe qué tiene.',
  },
  {
    corte: 'El cliente decidió',
    mide: 'Calidad de la comunicación comercial',
    detalle: 'Una cotización que el cliente nunca abrió no es un problema de precio.',
  },
  {
    corte: 'Repuestos completos',
    mide: 'Desempeño de la cadena de compras',
    detalle: 'El instante desde el cual se puede medir al técnico con justicia.',
  },
  {
    corte: 'Reparación terminada',
    mide: 'Productividad real del taller',
    detalle: 'Tiempo efectivo, sin las esperas que no dependían de él.',
  },
] as const;

/** Decisiones de diseño que distinguen el sistema. Cada una resuelve un problema real. */
const DECISIONES = [
  {
    titulo: 'El cronómetro no miente',
    cuerpo:
      'No arranca al abrir la orden: arranca cuando llegan TODOS los repuestos y el técnico pulsa iniciar. Si corriera antes, un técnico impecable en un taller con compras lentas aparecería como improductivo, y el indicador mediría lo contrario de lo que pretende.',
  },
  {
    titulo: 'El cliente aprueba línea por línea',
    cuerpo:
      'Puede aprobar las pastillas, rechazar los discos y aprobar el alineamiento en la misma cotización. Solo los trabajos aprobados vuelven al técnico; los rechazados quedan bloqueados y reaparecen como recomendación en la siguiente visita.',
  },
  {
    titulo: 'El gris gana al rojo',
    cuerpo:
      'Una orden parada seis días porque el cliente no contesta no es lo mismo que una que el taller gestiona mal. Pintarlas del mismo color hace inútil el tablero. El semáforo separa lo que depende de ti de lo que depende de un tercero.',
  },
  {
    titulo: 'Cero filas, no un error',
    cuerpo:
      'Si un usuario de una empresa manipula la URL para pedir datos de otra, la consulta devuelve cero filas. No un error revelador, no datos ajenos: cero. Lo decide PostgreSQL, no el navegador, y está demostrado con dos usuarios reales.',
  },
  {
    titulo: 'Lo emitido no se reescribe',
    cuerpo:
      'Una cotización enviada al cliente no se edita: si aparece trabajo adicional se emite una versión nueva y la anterior queda congelada. La base de datos lo impide incluso desde la consola.',
  },
  {
    titulo: 'La evidencia cuelga del hallazgo',
    cuerpo:
      'Las fotos y vídeos no van sueltos en la orden: van atados al ítem de diagnóstico que los justifica. Cuando el cliente pregunta por qué hay que cambiar una pieza, la prueba está junto a la línea que la cobra.',
  },
] as const;

const CIFRAS = [
  { valor: '34', etiqueta: 'estados con transiciones validadas' },
  { valor: '68', etiqueta: 'tablas, todas con seguridad por fila' },
  { valor: '195', etiqueta: 'políticas de acceso, ninguna de borrado' },
  { valor: '97', etiqueta: 'pruebas del dominio, sin base de datos' },
] as const;

function Eyebrow({ children }: { readonly children: React.ReactNode }) {
  return (
    <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-brand-600">
      {children}
    </p>
  );
}

export default function PresentacionPage() {
  return (
    <div className="bg-surface">
      {/* ── Cabecera ───────────────────────────────────────────────────── */}
      <header className="bg-graphite-950">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 lg:px-8">
          <span className="flex items-center gap-2.5 text-graphite-50">
            <span
              aria-hidden
              className="grid size-8 place-items-center rounded-control bg-brand-600 font-display text-sm font-bold text-white"
            >
              D
            </span>
            <span className="font-display text-base font-semibold tracking-tight">
              {clientEnv.NEXT_PUBLIC_APP_NAME}
            </span>
          </span>
          <Link
            href={APP}
            className="rounded-control border border-graphite-700 px-3.5 py-2 text-sm font-medium text-graphite-100 transition-colors hover:border-graphite-500 hover:text-white"
          >
            Entrar al sistema
          </Link>
        </div>
      </header>

      {/* ── Portada ────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-graphite-950 text-graphite-100">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-brand-600 to-transparent"
        />
        <div className="mx-auto max-w-6xl px-5 pb-20 pt-12 lg:px-8 lg:pb-28 lg:pt-20">
          <p className="mb-5 inline-flex items-center gap-2 rounded-chip border border-graphite-700 px-3 py-1 text-xs text-graphite-300">
            <span aria-hidden className="inline-block size-1.5 rounded-full bg-ok-500" />
            Sistema en funcionamiento · fases 1 y 2 entregadas
          </p>

          <h1 className="max-w-4xl font-display text-4xl font-semibold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl">
            Del ingreso del vehículo a la entrega,
            <span className="text-brand-400"> en una sola orden</span>.
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-graphite-300">
            Recepción con checklist y evidencia, diagnóstico que el cliente aprueba línea por
            línea, compras trazables hasta la pieza instalada, y tiempos que miden lo que de
            verdad hizo el taller —no lo que estuvo esperando.
          </p>

          <div className="mt-9 flex flex-wrap gap-3">
            <Link
              href={`${APP}/tablero`}
              className="inline-flex h-12 items-center rounded-control bg-brand-600 px-6 text-sm font-medium text-white transition-colors hover:bg-brand-500"
            >
              Ver el tablero en vivo
            </Link>
            <Link
              href={REPO}
              className="inline-flex h-12 items-center rounded-control border border-graphite-700 px-6 text-sm font-medium text-graphite-100 transition-colors hover:border-graphite-500 hover:text-white"
            >
              Ver el código
            </Link>
          </div>

          {/* El recorrido, como secuencia */}
          <ol className="mt-14 flex flex-wrap items-center gap-x-2 gap-y-3">
            {ETAPAS.map((etapa, i) => (
              <li key={etapa} className="flex items-center gap-2">
                <span className="rounded-chip border border-graphite-700 bg-graphite-900 px-3 py-1.5 text-xs font-medium text-graphite-200">
                  {etapa}
                </span>
                {i < ETAPAS.length - 1 && (
                  <span aria-hidden className="text-graphite-600">→</span>
                )}
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Los cuatro momentos ────────────────────────────────────────── */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-6xl px-5 py-16 lg:px-8 lg:py-24">
          <Eyebrow>Lo que hay que medir bien</Eyebrow>
          <h2 className="max-w-3xl font-display text-3xl font-semibold tracking-tight text-fg lg:text-4xl">
            Un vehículo pasa por decenas de eventos. Solo cuatro explican si el taller cumple.
          </h2>
          <p className="mt-4 max-w-2xl text-fg-muted">
            Medir el tiempo total en taller mezcla el trabajo del técnico con la espera del
            cliente y la lentitud del proveedor. Estos cuatro cortes los separan.
          </p>

          <ol className="mt-12 grid gap-px overflow-hidden rounded-panel border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
            {MOMENTOS.map((m, i) => (
              <li key={m.corte} className="bg-surface-raised p-6">
                <span
                  data-numeric
                  className="font-mono text-xs text-brand-600"
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h3 className="mt-3 font-display text-base font-semibold text-fg">{m.corte}</h3>
                <p className="mt-2 text-sm font-medium text-fg-muted">{m.mide}</p>
                <p className="mt-3 text-sm leading-relaxed text-fg-subtle">{m.detalle}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Decisiones de diseño ───────────────────────────────────────── */}
      <section className="bg-surface-sunken">
        <div className="mx-auto max-w-6xl px-5 py-16 lg:px-8 lg:py-24">
          <Eyebrow>Por qué está construido así</Eyebrow>
          <h2 className="max-w-3xl font-display text-3xl font-semibold tracking-tight text-fg lg:text-4xl">
            Seis decisiones que cambian cómo se opera el taller.
          </h2>

          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {DECISIONES.map((d) => (
              <article
                key={d.titulo}
                className="rounded-panel border border-border bg-surface-raised p-6 shadow-raise"
              >
                <h3 className="font-display text-lg font-semibold tracking-tight text-fg">
                  {d.titulo}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-fg-muted">{d.cuerpo}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── Cifras ─────────────────────────────────────────────────────── */}
      <section className="border-y border-border">
        <div className="mx-auto max-w-6xl px-5 py-16 lg:px-8 lg:py-20">
          <Eyebrow>Lo que ya está construido</Eyebrow>
          <dl className="mt-8 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {CIFRAS.map((c) => (
              <div key={c.etiqueta}>
                <dt className="sr-only">{c.etiqueta}</dt>
                <dd>
                  <span
                    data-numeric
                    className="block font-display text-5xl font-semibold tracking-tight text-fg"
                  >
                    {c.valor}
                  </span>
                  <span className="mt-2 block text-sm leading-snug text-fg-muted">
                    {c.etiqueta}
                  </span>
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-10 max-w-3xl text-sm leading-relaxed text-fg-subtle">
            Las reglas no viven solo en la aplicación: la base de datos rechaza un cambio de estado
            fuera del recorrido, la edición de una cotización ya emitida y la ejecución de un
            trabajo que el cliente rechazó. La línea de tiempo del vehículo la escribe un
            disparador, así que está completa por construcción.
          </p>
        </div>
      </section>

      {/* ── Cierre ─────────────────────────────────────────────────────── */}
      <section className="bg-graphite-950">
        <div className="mx-auto max-w-6xl px-5 py-16 lg:px-8 lg:py-24">
          <h2 className="max-w-2xl font-display text-3xl font-semibold tracking-tight text-white lg:text-4xl">
            Está funcionando ahora mismo.
          </h2>
          <p className="mt-4 max-w-2xl text-graphite-300">
            El tablero, el detalle de una orden con su desglose de avance y las acciones que la
            máquina de estados permite en cada momento. Entra y recórrelo.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={`${APP}/tablero`}
              className="inline-flex h-12 items-center rounded-control bg-white px-6 text-sm font-medium text-graphite-950 transition-colors hover:bg-graphite-100"
            >
              Abrir el tablero
            </Link>
            <Link
              href={`${APP}/ordenes/os-154`}
              className="inline-flex h-12 items-center rounded-control border border-graphite-700 px-6 text-sm font-medium text-graphite-100 transition-colors hover:border-graphite-500 hover:text-white"
            >
              Ver una orden por dentro
            </Link>
          </div>
        </div>
      </section>

      <footer className="bg-graphite-950 pb-10">
        <div className="mx-auto max-w-6xl border-t border-graphite-800 px-5 pt-8 lg:px-8">
          <p className="text-xs text-graphite-400">
            {clientEnv.NEXT_PUBLIC_APP_NAME} · Plataforma de gestión de taller automotriz y
            experiencia del cliente. Los datos mostrados en el sistema son de demostración.
          </p>
        </div>
      </footer>
    </div>
  );
}
