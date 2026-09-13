'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Building2, Check, UserRound, X } from 'lucide-react';
import { Field } from '@/components/ui/field';
import { Input, Select } from '@/components/ui/input';
import {
  checkDocument,
  checkEmail,
  checkPhone,
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
  readonly tradeName: string;
  readonly contactName: string;
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
  tradeName: '',
  contactName: '',
  phone: '',
  email: '',
  corporateClient: '',
};

/**
 * Alta de cliente, en un modal centrado.
 *
 * Se abre desde `/clientes` y también desde la recepción. Ese segundo caso es
 * el que manda en el diseño: el asesor tiene el vehículo delante, descubre que
 * el cliente no existe, y mandarlo a otra página completa le hace perder la
 * recepción a medias. Aquí crea, cierra y sigue donde estaba.
 *
 * ── Por qué dejó de ser un cajón lateral ───────────────────────────────────
 *
 * Un cajón de 400 px obliga a apilar los campos en una sola columna, y un
 * formulario de siete campos en columna se lee como largo aunque no lo sea.
 * Centrado y a 720 px caben dos por fila —nombre y apellidos, teléfono y
 * correo—, que es como están en cualquier papel: el formulario ocupa la mitad
 * de alto y se abarca de una mirada.
 *
 * ── Por qué hay tan pocos campos ───────────────────────────────────────────
 *
 * Documento, nombre, contacto y empresa. Dirección, teléfono alternativo,
 * preferencia de contacto y el resto se completan después desde la ficha,
 * cuando haya tiempo y el cliente no esté esperando de pie.
 *
 * Un formulario largo en este momento no recoge más datos: recoge los mismos
 * datos peor, porque el asesor escribe cualquier cosa para salir del paso.
 *
 * ── El aviso de duplicado ──────────────────────────────────────────────────
 *
 * Aparece mientras se escribe y NO bloquea. Bloquear supondría que el sistema
 * está seguro, y aquí solo compara los tres últimos dígitos del documento
 * —lo único que la pantalla puede ver—. Quien está delante del cliente sabe
 * mejor que el sistema si es la misma persona.
 */
export function NewCustomerModal({
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
  const titleId = useId();

  const [draft, setDraft] = useState<NewCustomerDraft>({
    ...VACIO,
    document: initialDocument ?? '',
  });
  const [touched, setTouched] = useState(false);
  /** Mientras guarda. Es lo que impide el doble envío. */
  const [saving, setSaving] = useState(false);

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

  const empresa = draft.kind === 'empresa';
  const docCheck = checkDocument(draft.documentType, draft.document);
  const phoneCheck = checkPhone(draft.phone);
  const emailCheck = checkEmail(draft.email);

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

  const nombreListo = empresa ? draft.businessName.trim() !== '' : draft.firstName.trim() !== '';
  const puedeCrear = docCheck.valid && nombreListo && phoneCheck.valid && emailCheck.valid;

  const crear = (): void => {
    setTouched(true);
    if (!puedeCrear || saving) return;
    setSaving(true);
    onCreate(draft);
    setDraft({ ...VACIO });
    setTouched(false);
    setSaving(false);
    onClose();
  };

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      className={cn(
        /*
         * Centrado de verdad. `<dialog>` lo hace solo con `m-auto`, pero solo
         * si no hay márgenes puestos: el cajón anterior llevaba `ml-auto mr-0`
         * y eso es lo que lo pegaba al borde.
         */
        'm-auto w-[calc(100vw-2rem)] max-w-[45rem] p-0',
        'max-h-[calc(100dvh-2rem)] sm:max-h-[85vh]',
        'rounded-modal bg-surface-raised text-fg shadow-overlay',
        'animate-rise-in backdrop:bg-graphite-950/50 backdrop:backdrop-blur-[3px]',
      )}
    >
      {/*
        `noValidate` no desactiva las comprobaciones: desactiva LAS DEL
        NAVEGADOR. Con `type="email"`, Chrome interrumpe el envío antes de que
        corra nada nuestro y enseña su propio globo —«Please include an '@' in
        the email address»— en inglés, con su tipografía y apuntando al campo.
        El resultado era que los mensajes en español de debajo del campo no
        llegaban a pintarse nunca.

        Los `type` se quedan: son los que abren el teclado correcto en el
        móvil. Lo único que se va es el globo.
      */}
      <form
        noValidate
        className="flex max-h-[inherit] flex-col"
        onSubmit={(e) => {
          e.preventDefault();
          crear();
        }}
      >
        <header className="flex items-start gap-3 border-b border-border px-6 py-5">
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="font-display text-xl font-semibold tracking-tight">
              Nuevo cliente
            </h2>
            <p className="mt-0.5 text-sm text-fg-muted">
              Registra los datos esenciales. Podrás completar su ficha después.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="grid size-9 shrink-0 place-items-center rounded-control text-fg-muted transition-colors duration-150 hover:bg-surface-sunken hover:text-fg"
          >
            <X aria-hidden className="size-4" />
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
          {/* Persona o empresa primero: decide qué documento se pide y qué
              campos tienen sentido. Preguntarlo después obliga a reescribir. */}
          <fieldset>
            <legend className="sr-only">Naturaleza del cliente</legend>
            <div className="grid grid-cols-2 gap-1 rounded-control bg-surface-sunken p-1">
              {(
                [
                  { kind: 'persona' as const, icon: <UserRound />, label: 'Persona', doc: 'DNI' as const },
                  { kind: 'empresa' as const, icon: <Building2 />, label: 'Empresa', doc: 'RUC' as const },
                ]
              ).map((o) => (
                <button
                  key={o.kind}
                  type="button"
                  onClick={() => {
                    set('kind', o.kind);
                    set('documentType', o.doc);
                  }}
                  aria-pressed={draft.kind === o.kind}
                  className={cn(
                    'flex h-10 items-center justify-center gap-2 rounded-[0.375rem] text-sm transition-colors duration-150',
                    draft.kind === o.kind
                      ? 'bg-graphite-950 font-semibold text-white shadow-raise'
                      : 'text-fg-muted hover:text-fg',
                  )}
                >
                  <span aria-hidden className="[&>svg]:size-4">
                    {o.icon}
                  </span>
                  {o.label}
                </button>
              ))}
            </div>
          </fieldset>

          <Field
            label={empresa ? 'RUC' : 'Documento'}
            required
            error={touched && !docCheck.valid ? docCheck.problem : undefined}
          >
            <Input
              ref={firstFieldRef}
              inputMode="numeric"
              autoComplete="off"
              value={draft.document}
              onChange={(e) => set('document', e.target.value)}
              placeholder={empresa ? '20100113610' : '43802725'}
            />
          </Field>

          {empresa ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Razón social" required>
                <Input
                  value={draft.businessName}
                  onChange={(e) => set('businessName', e.target.value)}
                  placeholder="Transportes del Sur S.A.C."
                />
              </Field>
              <Field label="Nombre comercial">
                <Input
                  value={draft.tradeName}
                  onChange={(e) => set('tradeName', e.target.value)}
                  placeholder="Transur"
                />
              </Field>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
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
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Teléfono"
              hint="Por donde se le avisa del avance."
              error={touched && !phoneCheck.valid ? phoneCheck.problem : undefined}
            >
              <Input
                type="tel"
                inputMode="tel"
                value={draft.phone}
                onChange={(e) => set('phone', e.target.value)}
                placeholder="987 654 321"
              />
            </Field>
            <Field
              label="Correo"
              error={touched && !emailCheck.valid ? emailCheck.problem : undefined}
            >
              <Input
                type="email"
                value={draft.email}
                onChange={(e) => set('email', e.target.value)}
                placeholder="correo@ejemplo.com"
              />
            </Field>
          </div>

          {/* Solo en empresa: en una persona, el contacto principal ES la
              persona, y preguntarlo otra vez es pedir dos veces lo mismo. */}
          {empresa && (
            <Field label="Contacto principal" hint="Con quién se habla en el día a día.">
              <Input
                value={draft.contactName}
                onChange={(e) => set('contactName', e.target.value)}
                placeholder="Rosa Delgado · Jefa de flota"
              />
            </Field>
          )}

          <Field label="Empresa corporativa" hint="Solo si pertenece a un cliente corporativo.">
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

        <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-border px-6 py-4">
          <p className="hidden min-w-0 flex-1 text-xs text-fg-subtle sm:block">
            Lo demás se completa después, desde su ficha.
          </p>

          <div className="flex flex-1 gap-3 sm:flex-none">
            <button
              type="button"
              onClick={onClose}
              className="h-11 flex-1 rounded-control border border-border-strong px-5 text-sm font-semibold text-fg transition-colors duration-150 hover:bg-surface-sunken sm:flex-none"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className={cn(
                'inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-control px-5 text-sm font-semibold',
                'transition-colors duration-150 sm:flex-none',
                puedeCrear && !saving
                  ? 'bg-romero-500 text-white hover:bg-romero-600 active:scale-[0.98]'
                  : 'cursor-not-allowed bg-surface-sunken text-fg-subtle',
              )}
            >
              <Check aria-hidden className="size-4" />
              {saving ? 'Creando cliente…' : 'Crear cliente'}
            </button>
          </div>
        </footer>
      </form>

      {/* El nombre del cliente en curso, para el lector de pantalla: el botón
          dice «Crear cliente» y sin esto no hay forma de saber a quién. */}
      <p className="sr-only" aria-live="polite">
        {nombre === '' ? '' : `Cliente en curso: ${nombre}`}
      </p>
    </dialog>
  );
}
