'use client';

import { useMemo } from 'react';
import { usePersistentState } from '@/lib/demo/store';
import { Boxes, Check, Plus, Send, ShoppingCart, Trash2, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input, Select, Textarea } from '@/components/ui/input';
import { Plate } from '@/components/ui/plate';
import { AssetImage } from '@/components/ui/asset-image';
import {
  groupByWork,
  isCoveredByStock,
  readiness,
  summarize,
  toBuy,
  URGENCY_LABELS,
  type RequestLine,
  type Urgency,
} from '@/features/parts/services/request';
import { cn } from '@/lib/utils/cn';

/**
 * Solicitud de repuestos — pantalla del TÉCNICO.
 *
 * TABLET-FIRST: el técnico la usa de pie junto al vehículo, con una tablet
 * apoyada en el carro de herramientas. Por eso los objetivos táctiles son
 * grandes, hay un solo panel de trabajo y nada de tablas densas.
 *
 * La solicitud se agrupa por TRABAJO AUTORIZADO, no por pieza suelta. Una
 * lista plana de números de parte obliga al asesor a reconstruir mentalmente
 * para qué es cada cosa, y es exactamente donde se cuela el repuesto de otra
 * orden.
 */
export function PartsRequest({
  initialLines,
  vehicle,
  plate,
  orderCode,
  customer,
  works,
}: {
  readonly initialLines: readonly RequestLine[];
  readonly vehicle: string;
  readonly plate: string;
  readonly orderCode: string;
  readonly customer: string;
  /** Trabajos que el cliente autorizó. Solo se pide repuesto para estos. */
  readonly works: readonly { readonly id: string; readonly title: string }[];
}) {
  const [lines, setLines] = usePersistentState<readonly RequestLine[]>(
    `solicitud-repuestos.${orderCode}`,
    initialLines,
  );
  const [sent, setSent] = usePersistentState(`solicitud-repuestos.${orderCode}.enviada`, false);

  const groups = useMemo(() => groupByWork(lines), [lines]);
  const totals = useMemo(() => summarize(lines), [lines]);
  const state = useMemo(() => readiness(lines), [lines]);

  const patch = (id: string, change: Partial<RequestLine>): void =>
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...change } : l)));

  const remove = (id: string): void => setLines((prev) => prev.filter((l) => l.id !== id));

  const add = (workId: string, workTitle: string): void =>
    setLines((prev) => [
      ...prev,
      {
        id: `n${Date.now().toString(36)}`,
        workId,
        workTitle,
        description: '',
        quantity: 1,
        urgency: 'normal',
        inStock: 0,
      },
    ]);

  if (sent) {
    return <Sent orderCode={orderCode} totals={totals} onBack={() => setSent(false)} />;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-5 rounded-panel border border-border bg-surface-raised p-5">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-semibold tracking-tight text-fg">
            Solicitud de repuestos
          </h1>
          <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">
            Pide solo lo que necesitan los trabajos que el cliente ya autorizó.
          </p>
          <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <span data-numeric className="font-mono text-xs text-fg-subtle">
              {orderCode}
            </span>
            <span className="text-fg-muted">{customer}</span>
          </p>
        </div>

        <div className="flex items-center gap-4">
          <AssetImage
            alt={`Ilustración de ${vehicle}`}
            subject={vehicle}
            fit="cover"
            rounded="control"
            className="h-16 w-24 shrink-0"
          />
          <div className="text-right">
            <p className="font-display text-base font-semibold tracking-tight text-fg">{vehicle}</p>
            <Plate value={plate} className="mt-1.5" />
          </div>
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-5">
          {groups.length === 0 && <Empty works={works} onAdd={add} />}

          {groups.map((group) => (
            <section
              key={group.workId}
              className="overflow-hidden rounded-panel border border-border bg-surface-raised"
            >
              <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
                <h2 className="font-display text-base font-semibold tracking-tight text-fg">
                  {group.workTitle}
                </h2>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => add(group.workId, group.workTitle)}
                >
                  <Plus aria-hidden className="size-4" />
                  Agregar repuesto
                </Button>
              </header>

              <ul className="divide-y divide-border">
                {group.lines.map((line) => (
                  <LineEditor
                    key={line.id}
                    line={line}
                    onChange={(change) => patch(line.id, change)}
                    onRemove={() => remove(line.id)}
                  />
                ))}
              </ul>
            </section>
          ))}

          {groups.length > 0 && works.length > groups.length && (
            <section className="rounded-panel border border-dashed border-border-strong bg-surface-raised p-5">
              <h2 className="text-sm font-medium text-fg">Otros trabajos autorizados</h2>
              <p className="mt-1 text-sm text-fg-muted">
                Todavía no has pedido repuestos para estos. Si no los necesitan, déjalos así.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {works
                  .filter((w) => !groups.some((g) => g.workId === w.id))
                  .map((w) => (
                    <Button
                      key={w.id}
                      variant="secondary"
                      size="sm"
                      onClick={() => add(w.id, w.title)}
                    >
                      <Plus aria-hidden className="size-4" />
                      {w.title}
                    </Button>
                  ))}
              </div>
            </section>
          )}
        </div>

        <aside className="lg:sticky lg:top-5 lg:self-start">
          <section className="rounded-panel border border-border bg-surface-raised p-5">
            <h2 className="font-display text-base font-semibold tracking-tight text-fg">
              Resumen
            </h2>

            <dl className="mt-4 space-y-2.5 text-sm">
              <Row label="Trabajos" value={String(totals.workCount)} />
              <Row label="Repuestos distintos" value={String(totals.lineCount)} />
              <Row label="Unidades pedidas" value={String(totals.unitCount)} />
            </dl>

            <div className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
              <p className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-2 text-fg-muted">
                  <Boxes aria-hidden className="size-4 text-ok-600" />
                  Cubierto por almacén
                </span>
                <span data-numeric className="font-medium text-fg">
                  {totals.unitCount - totals.toBuyCount}
                </span>
              </p>
              <p className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-2 text-fg-muted">
                  <ShoppingCart aria-hidden className="size-4 text-brand-600" />
                  Por comprar
                </span>
                <span data-numeric className="font-semibold text-fg">
                  {totals.toBuyCount}
                </span>
              </p>
            </div>

            {totals.urgentLines > 0 && (
              <p className="mt-4 flex items-start gap-2 rounded-control border border-warn-500/30 bg-warn-100 px-3 py-2.5 text-sm text-warn-700">
                <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
                <span>
                  {totals.urgentLines === 1
                    ? '1 repuesto marcado como urgente.'
                    : `${totals.urgentLines} repuestos marcados como urgentes.`}
                </span>
              </p>
            )}

            <Button
              block
              size="lg"
              className="mt-5"
              disabled={!state.canSubmit}
              onClick={() => setSent(true)}
            >
              <Send aria-hidden className="size-4" />
              Enviar al asesor
            </Button>

            {state.blockers.length > 0 && (
              <ul className="mt-3 space-y-1.5">
                {state.blockers.map((b) => (
                  <li key={b} className="flex items-start gap-2 text-sm text-fg-muted">
                    <TriangleAlert aria-hidden className="mt-0.5 size-3.5 shrink-0 text-warn-600" />
                    {b}
                  </li>
                ))}
              </ul>
            )}

            <p className="mt-4 rounded-control bg-surface-sunken px-3 py-2.5 text-xs leading-relaxed text-fg-subtle">
              El asesor revisa la solicitud antes de que Compras salga a cotizar. Puede recortar
              cantidades o rechazar una línea, y siempre con motivo.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}

function LineEditor({
  line,
  onChange,
  onRemove,
}: {
  readonly line: RequestLine;
  readonly onChange: (change: Partial<RequestLine>) => void;
  readonly onRemove: () => void;
}) {
  const cubierto = isCoveredByStock(line);
  const comprar = toBuy(line);
  const urgenteSinMotivo = line.urgency === 'urgente' && (line.note ?? '').trim() === '';

  return (
    <li className="px-5 py-4">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_7rem_9rem_auto] sm:items-end">
        <Field label="Repuesto">
          <Input
            value={line.description}
            placeholder="Descripción de la pieza"
            onChange={(e) => onChange({ description: e.target.value })}
          />
        </Field>

        <Field label="Cantidad">
          <Input
            type="number"
            min={1}
            step={1}
            inputMode="numeric"
            value={String(line.quantity)}
            onChange={(e) => onChange({ quantity: Number(e.target.value) })}
          />
        </Field>

        <Field label="Urgencia">
          <Select
            value={line.urgency}
            onChange={(e) => onChange({ urgency: e.target.value as Urgency })}
          >
            {(Object.keys(URGENCY_LABELS) as Urgency[]).map((u) => (
              <option key={u} value={u}>
                {URGENCY_LABELS[u]}
              </option>
            ))}
          </Select>
        </Field>

        <Button
          variant="ghost"
          size="md"
          aria-label={`Quitar ${line.description === '' ? 'este repuesto' : line.description}`}
          onClick={onRemove}
          className="justify-self-start text-fg-subtle hover:text-crit-600 sm:justify-self-end"
        >
          <Trash2 aria-hidden className="size-4" />
        </Button>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm">
        {line.partNumber !== undefined && line.partNumber !== '' && (
          <span data-numeric className="font-mono text-xs text-fg-subtle">
            {line.partNumber}
          </span>
        )}
        <span
          className={cn(
            'inline-flex items-center gap-1.5 text-sm',
            cubierto ? 'text-ok-600' : 'text-fg-muted',
          )}
        >
          {cubierto ? (
            <Check aria-hidden className="size-4" />
          ) : (
            <ShoppingCart aria-hidden className="size-4" />
          )}
          {cubierto
            ? `En almacén (${line.inStock})`
            : `Comprar ${comprar}${line.inStock > 0 ? ` · ${line.inStock} en almacén` : ''}`}
        </span>
      </div>

      {line.urgency === 'urgente' && (
        <div className="mt-3">
          <Field
            label="Por qué es urgente"
            error={urgenteSinMotivo ? 'Compras necesita el motivo para pagar un flete express.' : undefined}
          >
            <Textarea
              rows={2}
              value={line.note ?? ''}
              placeholder="Ej.: el cliente viaja el viernes y no acepta postergar."
              onChange={(e) => onChange({ note: e.target.value })}
            />
          </Field>
        </div>
      )}
    </li>
  );
}

function Empty({
  works,
  onAdd,
}: {
  readonly works: readonly { readonly id: string; readonly title: string }[];
  readonly onAdd: (workId: string, workTitle: string) => void;
}) {
  return (
    <section className="rounded-panel border border-dashed border-border-strong bg-surface-raised px-6 py-12 text-center">
      <span aria-hidden className="mx-auto grid size-14 place-items-center rounded-full bg-surface-sunken text-fg-subtle">
        <Boxes className="size-7" />
      </span>
      <h2 className="mt-4 font-display text-lg font-semibold tracking-tight text-fg">
        Todavía no has pedido nada
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-fg-muted">
        Elige el trabajo autorizado que necesita repuestos. Si ninguno los necesita, la orden
        pasa directamente a reparación.
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {works.map((w) => (
          <Button key={w.id} variant="secondary" onClick={() => onAdd(w.id, w.title)}>
            <Plus aria-hidden className="size-4" />
            {w.title}
          </Button>
        ))}
      </div>
    </section>
  );
}

function Sent({
  orderCode,
  totals,
  onBack,
}: {
  readonly orderCode: string;
  readonly totals: ReturnType<typeof summarize>;
  readonly onBack: () => void;
}) {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <span aria-hidden className="mx-auto grid size-16 place-items-center rounded-full bg-ok-100 text-ok-600">
        <Check className="size-8" />
      </span>
      <h1 className="mt-5 font-display text-2xl font-semibold tracking-tight text-fg">
        Solicitud enviada
      </h1>
      <p className="mt-2 text-base leading-relaxed text-fg-muted">
        {totals.lineCount === 1
          ? 'Pediste 1 repuesto'
          : `Pediste ${totals.lineCount} repuestos`}{' '}
        para {orderCode}. El asesor la revisa antes de que Compras salga a cotizar.
      </p>
      {totals.toBuyCount === 0 && totals.lineCount > 0 && (
        <p className="mt-3 text-sm leading-relaxed text-fg-muted">
          El almacén cubre todo lo pedido, así que esta orden no pasará por Compras.
        </p>
      )}
      <Button variant="secondary" className="mt-6" onClick={onBack}>
        Volver a la solicitud
      </Button>
    </div>
  );
}

function Row({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-fg-muted">{label}</dt>
      <dd data-numeric className="font-medium text-fg">
        {value}
      </dd>
    </div>
  );
}
