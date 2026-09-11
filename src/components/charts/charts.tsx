import type { ReactNode } from 'react';
import {
  band,
  donutArc,
  donutSegments,
  linear,
  linePath,
  niceTicks,
  zeroBasedDomain,
} from '@/features/analytics/services/scale';
import { cn } from '@/lib/utils/cn';

/**
 * Gráficos en SVG plano.
 *
 * Sin librería: la geometría vive en `scale.ts`, que es código puro y probado,
 * y aquí solo se pintan elementos. Eso es lo que permite que el PDF de la
 * Fase 16 dibuje EXACTAMENTE lo mismo con `@react-pdf/renderer`, que no
 * entiende de componentes de React que escriben en el DOM.
 *
 * Son Server Components: no llevan `'use client'` porque no necesitan estado.
 * Un gráfico que no se puede renderizar en el servidor obliga a enviar la
 * serie entera al navegador para dibujarla allí.
 */

const AXIS = 'fill-fg-subtle text-[0.625rem]';

export function BarChart({
  data,
  format,
  height = 200,
  label,
}: {
  readonly data: readonly { readonly label: string; readonly value: number }[];
  readonly format: (value: number) => string;
  readonly height?: number;
  readonly label: string;
}) {
  if (data.length === 0) return <Empty height={height} />;

  const width = 900;
  const pad = { top: 12, right: 8, bottom: 28, left: 56 };
  const values = data.map((d) => d.value);
  const y = linear(zeroBasedDomain(values), [height - pad.bottom, pad.top]);
  const x = band(data.length, [pad.left, width - pad.right], 0.35);
  const baseline = y(0);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={label}
      className="w-full"
    >
      {niceTicks(...zeroBasedDomain(values), 4).map((t) => (
        <g key={t}>
          <line
            x1={pad.left}
            x2={width - pad.right}
            y1={y(t)}
            y2={y(t)}
            className="stroke-border"
            strokeWidth={1}
          />
          <text x={pad.left - 8} y={y(t) + 3} textAnchor="end" className={AXIS}>
            {format(t)}
          </text>
        </g>
      ))}

      {data.map((d, i) => {
        const top = Math.min(y(d.value), baseline);
        const h = Math.abs(baseline - y(d.value));
        return (
          <g key={d.label}>
            <rect
              x={x(i)}
              y={top}
              width={x.bandwidth}
              height={Math.max(1, h)}
              rx={3}
              className="fill-brand-600"
            />
            <text
              x={x(i) + x.bandwidth / 2}
              y={height - 10}
              textAnchor="middle"
              className={AXIS}
            >
              {truncate(d.label, 14)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function LineChart({
  data,
  format,
  height = 200,
  label,
}: {
  readonly data: readonly { readonly label: string; readonly value: number }[];
  readonly format: (value: number) => string;
  readonly height?: number;
  readonly label: string;
}) {
  if (data.length === 0) return <Empty height={height} />;

  const width = 900;
  const pad = { top: 12, right: 8, bottom: 24, left: 56 };
  const values = data.map((d) => d.value);
  const domain = zeroBasedDomain(values);
  const y = linear(domain, [height - pad.bottom, pad.top]);
  const x = linear([0, Math.max(1, data.length - 1)], [pad.left, width - pad.right]);

  const points = data.map((d, i) => [x(i), y(d.value)] as const);
  const area = `${linePath(points)} L${x(data.length - 1)},${y(domain[0])} L${x(0)},${y(domain[0])} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label} className="w-full">
      {niceTicks(...domain, 4).map((t) => (
        <g key={t}>
          <line
            x1={pad.left}
            x2={width - pad.right}
            y1={y(t)}
            y2={y(t)}
            className="stroke-border"
            strokeWidth={1}
          />
          <text x={pad.left - 8} y={y(t) + 3} textAnchor="end" className={AXIS}>
            {format(t)}
          </text>
        </g>
      ))}

      <path d={area} className="fill-brand-600/10" />
      <path
        d={linePath(points)}
        className="stroke-brand-600"
        strokeWidth={2}
        fill="none"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/*
        Solo se rotulan el primer y el último día. Con treinta puntos, todas
        las etiquetas se solapan hasta volverse una mancha gris.
      */}
      <text x={pad.left} y={height - 6} className={AXIS}>
        {data[0]?.label}
      </text>
      <text x={width - pad.right} y={height - 6} textAnchor="end" className={AXIS}>
        {data.at(-1)?.label}
      </text>
    </svg>
  );
}

export function DonutChart({
  data,
  height = 200,
  centerLabel,
  centerValue,
  label,
}: {
  readonly data: readonly { readonly label: string; readonly value: number; readonly className: string }[];
  readonly height?: number;
  readonly centerLabel: string;
  readonly centerValue: string;
  readonly label: string;
}) {
  const total = data.reduce((n, d) => n + d.value, 0);
  if (total === 0) return <Empty height={height} />;

  const size = height;
  const cx = size / 2;
  const cy = size / 2;
  const outer = size / 2 - 4;
  const inner = outer * 0.62;

  // El reparto de ángulos se calcula ANTES de renderizar. Acumular una
  // variable dentro del map es una mutación durante el render.
  const segments = donutSegments(data, (d) => d.value);

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={label}
      className="mx-auto block"
      style={{ height }}
    >
      {segments.map(({ item, startAngle, endAngle }) => (
        <path
          key={item.label}
          d={donutArc(cx, cy, outer, inner, startAngle, endAngle)}
          className={item.className}
        />
      ))}

      <text
        x={cx}
        y={cy - 2}
        textAnchor="middle"
        className="fill-fg font-display text-xl font-semibold"
      >
        {centerValue}
      </text>
      <text x={cx} y={cy + 14} textAnchor="middle" className="fill-fg-subtle text-[0.625rem]">
        {centerLabel}
      </text>
    </svg>
  );
}

export function ChartCard({
  title,
  description,
  action,
  children,
}: {
  readonly title: string;
  readonly description?: string;
  readonly action?: ReactNode;
  readonly children: ReactNode;
}) {
  return (
    <section className="rounded-panel border border-border bg-surface-raised p-5">
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="font-display text-base font-semibold tracking-tight text-fg">{title}</h2>
          {description !== undefined && (
            <p className="mt-0.5 text-sm text-fg-muted">{description}</p>
          )}
        </div>
        {action}
      </header>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function Legend({
  items,
}: {
  readonly items: readonly { readonly label: string; readonly value: string; readonly className: string }[];
}) {
  return (
    <ul className="mt-4 space-y-2">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-2.5 text-sm">
          <span aria-hidden className={cn('size-3 shrink-0 rounded-[0.2rem]', item.className)} />
          <span className="min-w-0 flex-1 truncate text-fg-muted">{item.label}</span>
          <span data-numeric className="shrink-0 font-medium text-fg">
            {item.value}
          </span>
        </li>
      ))}
    </ul>
  );
}

function Empty({ height }: { readonly height: number }) {
  return (
    <div
      style={{ height }}
      className="grid place-items-center rounded-control border border-dashed border-border-strong bg-surface-sunken text-sm text-fg-subtle"
    >
      Sin datos en este periodo
    </div>
  );
}

function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}
