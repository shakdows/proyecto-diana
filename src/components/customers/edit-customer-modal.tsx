'use client';

import { useRef, useState } from 'react';
import { Check, Mail, MessageCircle, Phone } from 'lucide-react';
import { Field } from '@/components/ui/field';
import { Input, Select } from '@/components/ui/input';
import { Modal, ModalActions } from '@/components/ui/modal';
import type { DemoCustomer } from '@/features/customers/demo';
import { editableFrom, type EditableFields } from '@/features/customers/services/edit';
import { checkEmail, checkPhone } from '@/features/customers/services/identity';
import { cn } from '@/lib/utils/cn';

/** El formulario trabaja con cadenas; `null` es «sin registrar». */
type Form = {
  readonly [K in keyof EditableFields]: string;
};

function formFrom(customer: DemoCustomer): Form {
  const f = editableFrom(customer);
  return {
    firstName: f.firstName ?? '',
    lastName: f.lastName ?? '',
    businessName: f.businessName ?? '',
    phone: f.phone ?? '',
    altPhone: f.altPhone ?? '',
    email: f.email ?? '',
    address: f.address ?? '',
    contactPreference: f.contactPreference,
    corporateClient: f.corporateClient ?? '',
  };
}

function orNull(value: string): string | null {
  const limpio = value.trim();
  return limpio === '' ? null : limpio;
}

/**
 * Editar los datos del cliente.
 *
 * ── Lo que NO está aquí ────────────────────────────────────────────────────
 *
 * El documento. La base guarda el número completo con `REVOKE SELECT` a
 * `authenticated` y la pantalla solo conoce los tres últimos: no hay nada que
 * editar. Y aunque lo hubiera, cambiar el documento de un cliente no es
 * corregir un dato: es decir que este cliente es otra persona, o fusionar dos
 * fichas. Eso no se hace desde un formulario de contacto.
 *
 * Los vehículos tampoco: tienen su propio alta, porque un vehículo es una cosa
 * con placa, historial y órdenes, no un campo de esta ficha.
 */
export function EditCustomerModal(props: {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onSave: (fields: Partial<EditableFields>) => void;
  readonly customer: DemoCustomer;
  readonly corporateClients: readonly string[];
}) {
  /*
   * El formulario se monta al abrir y se desmonta al cerrar, y de ahí sale
   * gratis lo que si no habría que sincronizar a mano: cada apertura parte del
   * dato guardado. Sin esto, cerrar con cambios a medias y volver a abrir
   * enseñaría el borrador viejo como si fuera el dato real del cliente —y el
   * arreglo con un efecto que reinicia el estado es justo el patrón que
   * convierte un render en dos y termina en bucles—.
   */
  if (!props.open) return null;
  return <EditCustomerForm {...props} />;
}

function EditCustomerForm({
  onClose,
  onSave,
  customer,
  corporateClients,
}: {
  readonly onClose: () => void;
  readonly onSave: (fields: Partial<EditableFields>) => void;
  readonly customer: DemoCustomer;
  readonly corporateClients: readonly string[];
}) {
  const primero = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<Form>(() => formFrom(customer));
  const [touched, setTouched] = useState(false);

  const set = <K extends keyof Form>(key: K, value: string): void => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const empresa = customer.kind === 'empresa';
  const phoneCheck = checkPhone(draft.phone);
  const altCheck = checkPhone(draft.altPhone);
  const emailCheck = checkEmail(draft.email);
  const nombreListo = empresa ? draft.businessName.trim() !== '' : draft.firstName.trim() !== '';
  const puede = nombreListo && phoneCheck.valid && altCheck.valid && emailCheck.valid;

  const guardar = (): void => {
    setTouched(true);
    if (!puede) return;
    onSave({
      firstName: empresa ? null : orNull(draft.firstName),
      lastName: empresa ? null : orNull(draft.lastName),
      businessName: empresa ? orNull(draft.businessName) : null,
      phone: orNull(draft.phone),
      altPhone: orNull(draft.altPhone),
      email: orNull(draft.email),
      address: orNull(draft.address),
      contactPreference: draft.contactPreference as DemoCustomer['contactPreference'],
      corporateClient: orNull(draft.corporateClient),
    });
    onClose();
  };

  const PREFERENCIAS = [
    { value: 'whatsapp', icon: <MessageCircle />, label: 'WhatsApp' },
    { value: 'telefono', icon: <Phone />, label: 'Llamada' },
    { value: 'correo', icon: <Mail />, label: 'Correo' },
  ] as const;

  return (
    <Modal
      open
      onClose={onClose}
      onSubmit={guardar}
      initialFocusRef={primero}
      title="Editar cliente"
      subtitle="El documento no se cambia desde aquí."
      footer={
        <ModalActions
          onCancel={onClose}
          confirmLabel="Guardar"
          confirmIcon={<Check aria-hidden className="size-4" />}
          disabled={!puede}
        />
      }
    >
      {empresa ? (
        <Field label="Razón social" required>
          <Input
            ref={primero}
            value={draft.businessName}
            onChange={(e) => set('businessName', e.target.value)}
            placeholder="Transportes del Sur S.A.C."
          />
        </Field>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre" required>
            <Input
              ref={primero}
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
          label="Teléfono alternativo"
          error={touched && !altCheck.valid ? altCheck.problem : undefined}
        >
          <Input
            type="tel"
            inputMode="tel"
            value={draft.altPhone}
            onChange={(e) => set('altPhone', e.target.value)}
            placeholder="01 4 220 118"
          />
        </Field>
      </div>

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

      <Field label="Dirección">
        <Input
          value={draft.address}
          onChange={(e) => set('address', e.target.value)}
          placeholder="Av. Primavera 1120, Surco"
        />
      </Field>

      <fieldset>
        <legend className="text-sm font-medium text-fg">Prefiere que le escriban por</legend>
        <div className="mt-1.5 grid grid-cols-3 gap-1 rounded-control bg-surface-sunken p-1">
          {PREFERENCIAS.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => set('contactPreference', o.value)}
              aria-pressed={draft.contactPreference === o.value}
              className={cn(
                'flex h-10 items-center justify-center gap-2 rounded-[0.375rem] text-sm transition-colors duration-150',
                draft.contactPreference === o.value
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

      <Field label="Empresa corporativa" hint="Solo si pertenece a un cliente corporativo.">
        <Select
          value={draft.corporateClient}
          onChange={(e) => set('corporateClient', e.target.value)}
        >
          <option value="">Sin empresa corporativa</option>
          {/* La que ya tiene puede no estar en el catálogo: se dio de alta al
              crear el cliente. Si no se añadiera, editar el correo le borraría
              la empresa sin que nadie lo pidiera. */}
          {(customer.corporateClient !== null && !corporateClients.includes(customer.corporateClient)
            ? [customer.corporateClient, ...corporateClients]
            : corporateClients
          ).map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
      </Field>
    </Modal>
  );
}
