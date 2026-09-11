'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Building2, Check, UserRound, X } from 'lucide-react';
import { Field } from '@/components/ui/field';
import { Input, Select } from '@/components/ui/input';
import { useToast } from '@/components/feedback/toast';
import {
  checkDocument,
  displayName,
  maskDocument,
  type CustomerKind,
  type DocumentType,
} from '@/features/customers/services/identity';
import {
  DUPLICATE_LABELS,
  findDuplicates,
  type SearchableCustomer,
} from '@/features/customers/services/search';
import { cn } from '@/lib/utils/cn';

export interface NewCustomerDraft {
  readonly kind: CustomerKind;
  readonly documentType: DocumentType;
  readonly document: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly businessName: string;
  readonly phone: string;
  readonly email: string;
  readonly corporateClient: string;
}

const VACIO: NewCustomerDraft = {
  kind: 'persona',
  documentType: 'DNI',
  document: '',
  firstName: '',
  lastName: '',
  businessName: '',
  phone: '',
  email: '',
  corporateClient: '',
};

/**
 * Alta de cliente en un cajón lateral.
 *
 * Se abre desde `/clientes` y también desde la recepción. Ese segundo caso es
 * el que manda en el diseño: el asesor tiene el vehículo delante, descubre que
 * el cliente no existe, y mandarlo a otra página completa le hace perder la
 * recepción a medias. Aquí crea, cierra y sigue donde estaba.
 *
 * ── Por qué hay tan pocos campos ────────────────────────────────────────────
 *
 * Documento, nombre, teléfono y empresa. Nada más. Dirección, correo
 * alternativo, preferencia de contacto y el resto se completan después desde
 * la ficha, cuando haya tiempo y el cliente no esté esperando de pie.
 *
 * Un formulario largo en este momento no recoge más datos: recoge los mismos
 * datos peor, porque el asesor escribe cualquier cosa para salir del paso.
 *
 * ── El aviso de duplicado ───────────────────────────────────────────────────
 *
 * Aparece mientras se escribe y NO bloquea. Bloquear supondría que el sistema
 * está seguro, y aquí solo compara los tres últimos dígitos del documento
 * —lo único que la pantalla puede ver—. Quien está delante del cliente sabe
 * mejor que el sistema si es la misma persona.
 */
export function NewCustomerDrawer({
  open,
  onClose,
  onCreate,
  existing,
  corporateClients,
  initialDocument,
}: {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onCreate: (draft: NewCustomerDraft) => void;
  /** Para avisar de duplicados sin salir a preguntar. */
  readonly existing: readonly SearchableCustomer[];
  readonly corporateClients: readonly string[];
  /** Documento ya tecleado en la pantalla anterior, si lo hay. */
  readonly initialDocument?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const titleId = useId();

  const [draft, setDraft] = useState<NewCustomerDraft>({
    ...VACIO,
    document: initialDocument ?? '',
  });
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (node === null) return;
    if (open && !node.open) {
      node.showModal();
      firstFieldRef.current?.focus();
    } else if (!open && node.open) {
      node.close();
    }
  }, [open]);

  useEffect(() => {
    const node = ref.current;
    if (node === null) return undefined;
    node.addEventListener('close', onClose);
    return () => node.removeEventListener('close', onClose);
  }, [onClose]);

  const set = <K extends keyof NewCustomerDraft>(key: K, value: NewCustomerDraft[K]): void => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const docCheck = checkDocument(draft.documentType, draft.document);
  const nombre = displayName({
    kind: draft.kind,
    firstName: draft.firstName,
    lastName: draft.lastName,
    businessName: draft.businessName,
  });

  const duplicates = useMemo(
    () =>
      findDuplicates(existing, {
        documentType: draft.documentType,
        documentLast: draft.document,
        phone: draft.phone,
        email: draft.email,
      }),
    [existing, draft.documentType, draft.document, draft.phone, draft.email],
  );

  const nombreListo =
    draft.kind === 'empresa' ? draft.businessName.trim() !== '' : draft.firstName.trim() !== '';
  const puedeCrear = docCheck.valid && nombreListo;

  const crear = (): void => {
    setTouched(true);
    if (!puedeCrear) return;
    onCreate(draft);
    toast(`${nombre} creado correctamente.`, 'ok');
    setDraft({ ...VACIO });
    setTouched(false);
    onClose();
  };

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      className={cn(
        'ml-auto mr-0 my-0 h-dvh max-h-dvh w-[calc(100vw-2rem)] max-w-[25rem]',
        'rounded-none rounded-l-modal bg-surface-raised p-0 text-fg shadow-overlay',
        'animate-slide-left backdrop:bg-graphite-950/40 backdrop:backdrop-blur-[2px]',
      )}
    >
      <form
        className="flex h-full flex-col"
        onSubmit={(e) => {
          e.preventDefault();
          crear();
        }}
      >
        <header className="flex items-center gap-3 border-b border-border px-5 py-4">
          <h2 id={titleId} className="min-w-0 flex-1 font-display text-lg font-semibold tracking-tight">
            Nuevo cliente
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="grid size-9 shrink-0 place-items-center rounded-control text-fg-muted transition-colors duration-150 hover:bg-surface-sunken hover:text-fg"
          >
            <X aria-hidden className="size-4" />
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5">
          {/* Persona o empresa primero: decide qué documento se pide y qué
              campos tienen sentido. Preguntarlo después obliga a reescribir. */}
          <fieldset>
            <legend className="text-xs uppercase tracking-wide text-fg-subtle">Tipo</legend>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {([
                { kind: 'persona' as const, icon: <UserRound />, label: 'Persona', doc: 'DNI' as const },
                { kind: 'empresa' as const, icon: <Building2 />, label: 'Empresa', doc: 'RUC' as const },
              ]).map((o) => (
                <button
                  key={o.kind}
                  type="button"
                  onClick={() => {
                    set('kind', o.kind);
                    set('documentType', o.doc);
                  }}
                  aria-pressed={draft.kind === o.kind}
                  className={cn(
                    'flex h-11 items-center justify-center gap-2 rounded-control border text-sm transition-colors duration-150',
                    draft.kind === o.kind
                      ? 'border-romero-500 bg-romero-500/8 font-semibold text-fg'
                      : 'border-border text-fg-muted hover:bg-surface-sunken',
                  )}
                >
                  <span aria-hidden className="[&>svg]:size-4">{o.icon}</span>
                  {o.label}
                </button>
              ))}
            </div>
          </fieldset>

          <Field
            label={draft.kind === 'empresa' ? 'RUC' : 'Documento'}
            required
            error={touched && !docCheck.valid ? docCheck.problem : undefined}
          >
            <Input
              ref={firstFieldRef}
              inputMode="numeric"
              autoComplete="off"
              value={draft.document}
              onChange={(e) => set('document', e.target.value)}
              placeholder={draft.kind === 'empresa' ? '20100113610' : '43802725'}
            />
          </Field>

          {draft.kind === 'empresa' ? (
            <Field label="Razón social" required>
              <Input
                value={draft.businessName}
                onChange={(e) => set('businessName', e.target.value)}
                placeholder="Transportes del Sur S.A.C."
              />
            </Field>
          ) : (
            <>
              <Field label="Nombre" required>
                <Input
                  value={draft.firstName}
                  onChange={(e) => set('firstName', e.target.value)}
                  placeholder="Juan"
                />
              </Field>
              <Field label="Apellidos">
                <Input
                  value={draft.lastName}
                  onChange={(e) => set('lastName', e.target.value)}
                  placeholder="Pérez García"
                />
              </Field>
            </>
          )}

          <Field label="Teléfono" hint="Por donde se le avisa del avance.">
            <Input
              type="tel"
              inputMode="tel"
              value={draft.phone}
              onChange={(e) => set('phone', e.target.value)}
              placeholder="987 654 321"
            />
          </Field>

          <Field label="Empresa corporativa" hint="Solo si su flota pertenece a una.">
            <Select
              value={draft.corporateClient}
              onChange={(e) => set('corporateClient', e.target.value)}
            >
              <option value="">Sin empresa corporativa</option>
              {corporateClients.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </Field>

          {duplicates.length > 0 && (
            <aside
              role="status"
              className="rounded-panel border border-warn-500/40 bg-warn-100 px-4 py-3"
            >
              <p className="text-sm font-semibold text-warn-700">
                {duplicates.length === 1
                  ? 'Encontramos un cliente que podría ser el mismo'
                  : `Encontramos ${String(duplicates.length)} clientes que podrían ser el mismo`}
              </p>
              <ul className="mt-2 space-y-1.5">
                {duplicates.slice(0, 3).map(({ customer, reason }) => (
                  <li key={customer.id} className="text-sm text-warn-700">
                    <span className="font-medium">{customer.name}</span>
                    <span className="text-warn-700/80">
                      {' · '}
                      {DUPLICATE_LABELS[reason]}
                      {' · '}
                      {maskDocument(customer.documentType, customer.documentLast)}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-warn-700/80">
                Puedes crearlo igual: tú tienes al cliente delante y el sistema no.
              </p>
            </aside>
          )}
        </div>

        <footer className="shrink-0 border-t border-border px-5 py-4">
          <button
            type="submit"
            className={cn(
              'flex h-12 w-full items-center justify-center gap-2 rounded-control text-sm font-semibold transition-colors duration-150',
              puedeCrear
                ? 'bg-romero-500 text-white hover:bg-romero-600'
                : 'cursor-not-allowed bg-surface-sunken text-fg-subtle',
            )}
          >
            <Check aria-hidden className="size-4" />
            Crear cliente
          </button>
          <p className="mt-2 text-center text-xs text-fg-subtle">
            Lo demás se completa después, desde su ficha.
          </p>
        </footer>
      </form>
    </dialog>
  );
}
