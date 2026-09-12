import { Check, Minus } from 'lucide-react';
import type { ReactNode } from 'react';
import {
  APP_SETTINGS,
  CHECKLIST,
  CORPORATE_CLIENTS,
  PAUSE_REASONS,
  SERVICE_TYPES,
  SURVEY_QUESTIONS,
} from '../../../db/seed/catalog';
import { ORDER_STATUSES, STATUS_LABELS } from '@/features/orders/services/order-status';
import { PERMISSIONS, ROLES, ROLE_LABELS, ROLE_PERMISSIONS } from '@/lib/auth/permissions';
import { cn } from '@/lib/utils/cn';

/**
 * Los paneles de configuración.
 *
 * ⚠️ TODOS SON DE SOLO LECTURA, y se dice en pantalla.
 *
 * Los catálogos ya existen y son la fuente de verdad del sistema; lo que
 * todavía no existe es la conexión a Postgres que permitiría guardarlos. Poner
 * aquí campos editables y un botón «Guardar» que no guarda sería peor que no
 * tener la pantalla: quien cambie un umbral se irá creyendo que lo cambió.
 *
 * Ver la configuración real ya vale por sí solo —hasta ahora no se podía
 * desde ningún sitio— y el día que haya base, cada panel gana sus campos sin
 * mover la estructura.
 */

export function SettingsPanel({ id }: { readonly id: string }) {
  switch (id) {
    case 'empresas':
      return <Empresas />;
    case 'servicios':
      return <Servicios />;
    case 'roles':
      return <Roles />;
    case 'checklist':
      return <Checklist />;
    case 'pausas':
      return <Pausas />;
    case 'workflow':
      return <Workflow />;
    case 'encuesta':
      return <Encuesta />;
    case 'parametros':
      return <Parametros />;
    default:
      return null;
  }
}

function Tabla({
  head,
  children,
}: {
  readonly head: readonly string[];
  readonly children: ReactNode;
}) {
  return (
    <div className="overflow-x-auto rounded-panel border border-border bg-surface-raised">
      <table className="w-full min-w-[32rem] text-sm">
        <thead>
          <tr className="border-b border-border">
            {head.map((h) => (
              <th
                key={h}
                scope="col"
                className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-fg-subtle"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">{children}</tbody>
      </table>
    </div>
  );
}

function Empresas() {
  return (
    <Tabla head={['Código', 'Nombre', 'Razón social', 'Color']}>
      {CORPORATE_CLIENTS.map((c) => (
        <tr key={c.code}>
          <td className="px-4 py-3 font-mono text-xs font-semibold text-fg">{c.code}</td>
          <td className="px-4 py-3 text-fg">{c.name}</td>
          <td className="px-4 py-3 text-fg-muted">{c.legalName}</td>
          <td className="px-4 py-3">
            <span className="flex items-center gap-2">
              <span
                aria-hidden
                className="size-4 shrink-0 rounded-chip border border-border"
                style={{ backgroundColor: c.brandColor }}
              />
              <span data-numeric className="text-xs text-fg-muted">
                {c.brandColor}
              </span>
            </span>
          </td>
        </tr>
      ))}
    </Tabla>
  );
}

function Servicios() {
  return (
    <ul className="grid gap-3">
      {SERVICE_TYPES.map((s) => (
        <li key={s.code} className="rounded-panel border border-border bg-surface-raised p-5">
          <p className="font-display text-base font-semibold text-fg">{s.name}</p>
          <p className="mt-1 text-sm text-fg-muted">
            Al terminar:{' '}
            {s.finalStages.length === 0 ? 'nada' : s.finalStages.join(' y ')}
          </p>
          {s.children !== undefined && (
            <ul className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3">
              {s.children.map((c) => (
                <li
                  key={c.code}
                  className="rounded-chip bg-surface-sunken px-2.5 py-1 text-xs text-fg-muted"
                >
                  {c.name.replace('Planchado y pintura · ', '')}
                </li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ul>
  );
}

/**
 * La matriz de permisos, entera.
 *
 * Sin resumir y sin agrupar en «puede administrar»: un resumen de permisos es
 * donde se esconden los agujeros. Quien revisa esto necesita ver la casilla
 * exacta, no una interpretación amable de lo que significa.
 */
function Roles() {
  return (
    <div className="overflow-x-auto rounded-panel border border-border bg-surface-raised">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th
              scope="col"
              className="sticky left-0 bg-surface-raised px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-fg-subtle"
            >
              Permiso
            </th>
            {ROLES.map((r) => (
              <th
                key={r}
                scope="col"
                className="px-2 py-3 text-center text-[0.625rem] font-medium text-fg-subtle"
              >
                <span className="block w-16 truncate" title={ROLE_LABELS[r]}>
                  {ROLE_LABELS[r]}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {PERMISSIONS.map((p) => (
            <tr key={p}>
              <th
                scope="row"
                className="sticky left-0 bg-surface-raised px-4 py-2 text-left font-mono text-xs font-normal text-fg"
              >
                {p}
              </th>
              {ROLES.map((r) => {
                const tiene = ROLE_PERMISSIONS[r].includes(p);
                return (
                  <td key={r} className="px-2 py-2 text-center">
                    {tiene ? (
                      <Check aria-label="sí" className="mx-auto size-4 text-ok-600" />
                    ) : (
                      <Minus aria-label="no" className="mx-auto size-3.5 text-fg-subtle/40" />
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Checklist() {
  return (
    <ul className="grid gap-3">
      {CHECKLIST.map((cat) => (
        <li key={cat.code} className="rounded-panel border border-border bg-surface-raised p-5">
          <p className="flex items-baseline justify-between gap-3">
            <span className="font-display text-base font-semibold text-fg">{cat.name}</span>
            <span data-numeric className="text-sm text-fg-muted">
              {cat.items.length} puntos
            </span>
          </p>
          <ul className="mt-3 flex flex-wrap gap-1.5 border-t border-border pt-3">
            {cat.items.map((i) => (
              <li
                key={i.code}
                className="rounded-chip bg-surface-sunken px-2 py-1 text-xs text-fg-muted"
              >
                {i.label}
                {i.inputType !== 'estado' && (
                  <span className="ml-1 text-fg-subtle">
                    · {i.inputType === 'estado_cantidad' ? 'cantidad' : 'medida'}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
}

function Pausas() {
  return (
    <Tabla head={['Motivo', '¿Cuenta como productivo?', '¿Congela la hora estimada?']}>
      {PAUSE_REASONS.map((p) => (
        <tr key={p.code}>
          <td className="px-4 py-3 text-fg">{p.label}</td>
          <td className="px-4 py-3">
            <Si valor={p.productive} />
          </td>
          <td className="px-4 py-3">
            <Si valor={p.blocksEta} />
          </td>
        </tr>
      ))}
    </Tabla>
  );
}

function Si({ valor }: { readonly valor: boolean }) {
  return (
    <span
      className={cn(
        'rounded-chip px-2 py-0.5 text-xs font-medium',
        valor ? 'bg-ok-100 text-ok-700' : 'bg-surface-sunken text-fg-muted',
      )}
    >
      {valor ? 'Sí' : 'No'}
    </span>
  );
}

function Workflow() {
  return (
    <div className="rounded-panel border border-border bg-surface-raised p-5">
      <p className="text-sm leading-relaxed text-fg-muted">
        El recorrido completo de una orden. Las transiciones válidas las decide la máquina de
        estados del dominio, no esta pantalla: aquí solo se ven.
      </p>
      <ol className="mt-4 flex flex-wrap gap-1.5">
        {ORDER_STATUSES.map((s) => (
          <li
            key={s}
            className="rounded-chip border border-border bg-surface-sunken px-2.5 py-1 text-xs text-fg-muted"
          >
            {STATUS_LABELS[s]}
          </li>
        ))}
      </ol>
    </div>
  );
}

function Encuesta() {
  return (
    <Tabla head={['#', 'Pregunta', 'Tipo', 'Cuenta para', 'Peso']}>
      {SURVEY_QUESTIONS.map((q, i) => (
        <tr key={q.code}>
          <td data-numeric className="px-4 py-3 text-fg-subtle">
            {i + 1}
          </td>
          <td className="px-4 py-3 text-fg">{q.text}</td>
          <td className="px-4 py-3 text-xs text-fg-muted">
            {q.type === 'scale_1_5'
              ? '1 a 5'
              : q.type === 'scale_0_10'
                ? '0 a 10'
                : q.type === 'single_choice'
                  ? 'opción'
                  : 'texto libre'}
          </td>
          <td className="px-4 py-3 text-xs uppercase text-fg-muted">
            {q.role === 'none' ? '—' : q.role}
          </td>
          <td data-numeric className="px-4 py-3 text-fg-muted">
            {q.weight}
          </td>
        </tr>
      ))}
    </Tabla>
  );
}

function Parametros() {
  return (
    <Tabla head={['Parámetro', 'Valor', 'Qué hace']}>
      {APP_SETTINGS.map((s) => (
        <tr key={s.key}>
          <td className="px-4 py-3 font-mono text-xs text-fg">{s.key}</td>
          <td className="px-4 py-3">
            <span
              data-numeric
              className="rounded-chip bg-surface-sunken px-2 py-0.5 text-xs text-fg"
            >
              {typeof s.value === 'object' ? JSON.stringify(s.value) : String(s.value)}
            </span>
          </td>
          <td className="px-4 py-3 text-fg-muted">{s.description}</td>
        </tr>
      ))}
    </Tabla>
  );
}
