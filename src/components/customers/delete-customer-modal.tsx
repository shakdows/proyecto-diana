'use client';

import { useRef, useState } from 'react';
import { Trash2, TriangleAlert } from 'lucide-react';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import type { DemoCustomer } from '@/features/customers/demo';
import { displayName } from '@/features/customers/services/identity';
import {
  DELETE_CODE,
  checkDeleteCode,
  removalKind,
  removalLabel,
  removalWarning,
} from '@/features/customers/services/removal';
import { cn } from '@/lib/utils/cn';

/**
 * Confirmar que se quita un cliente.
 *
 * ── ⚠ LA CLAVE NO ES UNA CONTRASEÑA ───────────────────────────────────────
 *
 * Está en el navegador y cualquiera la lee abriendo las herramientas de
 * desarrollo. No defiende de nadie que quiera saltársela; evita el resbalón,
 * que es el riesgo de verdad: un dedo apoyado en la tableta de recepción que
 * se lleva por delante la ficha de un cliente con diez visitas.
 *
 * Cuando haya base de datos, borrar pasa por permiso comprobado en el
 * servidor, RLS, rastro en la auditoría y borrado lógico —un cliente con
 * órdenes se archiva, no se borra, o los informes dejan de cuadrar—. Ver
 * `services/removal.ts`.
 *
 * ── Por qué el diálogo enseña el nombre y las órdenes ──────────────────────
 *
 * Porque un «¿Seguro?» a secas no informa de nada: quien lo lee ya decidió
 * que sí. Lo que hace dudar a tiempo es ver EL NOMBRE de quien se va a ir y
 * que tiene un coche en el taller ahora mismo.
 */
export function DeleteCustomerModal(props: {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onConfirm: () => void;
  readonly customer: DemoCustomer;
}) {
  /* Se monta al abrir: la clave nunca se queda escrita de la vez anterior. */
  if (!props.open) return null;
  return <DeleteCustomerForm {...props} />;
}

function DeleteCustomerForm({
  onClose,
  onConfirm,
  customer,
}: {
  readonly onClose: () => void;
  readonly onConfirm: () => void;
  readonly customer: DemoCustomer;
}) {
  const claveRef = useRef<HTMLInputElement>(null);
  const [clave, setClave] = useState('');
  const [touched, setTouched] = useState(false);

  const kind = removalKind(customer.id);
  const abiertas = customer.vehicles.filter((v) => v.openOrderId !== null).length;
  const check = checkDeleteCode(clave);
  const nombre = displayName(customer);

  /*
   * El error sale en cuanto se acaba de teclear, no al pulsar.
   *
   * El botón está apagado mientras la clave no sea la buena, así que pulsarlo
   * no hace nada —ni siquiera marcar el campo como tocado—: quien se equivoca
   * ve un botón gris y ningún motivo. Con esto, a los cuatro dígitos ya sabe
   * que no es esa, en vez de quedarse mirando.
   */
  const mostrarError =
    (touched || clave.trim().length >= DELETE_CODE.length) && !check.valid;

  const confirmar = (): void => {
    setTouched(true);
    if (!check.valid) return;
    onConfirm();
    onClose();
  };

  return (
    <Modal
      open
      width="sm"
      onClose={onClose}
      onSubmit={confirmar}
      initialFocusRef={claveRef}
      title={removalLabel(kind)}
      subtitle={`${nombre} · ${customer.documentType} ••${customer.documentLast}`}
      footer={
        <>
          <span className="hidden flex-1 sm:block" />
          <div className="flex flex-1 gap-3 sm:flex-none">
            <button
              type="button"
              onClick={onClose}
              className="h-11 flex-1 whitespace-nowrap rounded-control border border-border-strong px-4 text-sm font-semibold text-fg transition-colors duration-150 hover:bg-surface-sunken sm:flex-none sm:px-5"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!check.valid}
              className={cn(
                'inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-control text-sm font-semibold',
                'whitespace-nowrap px-4 sm:px-5',
                'transition-colors duration-150 sm:flex-none',
                /* Rojo crítico y no el rojo de la marca: el botón que borra no
                   puede parecerse al botón que crea. */
                check.valid
                  ? 'bg-crit-600 text-white hover:bg-crit-700 active:scale-[0.98]'
                  : 'cursor-not-allowed bg-surface-sunken text-fg-subtle',
              )}
            >
              <Trash2 aria-hidden className="size-4" />
              {removalLabel(kind)}
            </button>
          </div>
        </>
      }
    >
      <aside
        className={cn(
          'flex items-start gap-2.5 rounded-panel border px-4 py-3 text-sm',
          abiertas > 0
            ? 'border-crit-500/40 bg-crit-100 text-crit-700'
            : 'border-warn-500/40 bg-warn-100 text-warn-700',
        )}
      >
        <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
        <p>{removalWarning(kind, abiertas)}</p>
      </aside>

      <Field
        label="Clave de confirmación"
        required
        hint="No es una contraseña: solo evita que se borre de un clic sin querer."
        error={mostrarError ? check.problem : undefined}
      >
        <Input
          ref={claveRef}
          type="password"
          inputMode="numeric"
          autoComplete="off"
          value={clave}
          onChange={(e) => setClave(e.target.value)}
          placeholder="••••"
          className="font-mono tracking-[0.3em]"
        />
      </Field>
    </Modal>
  );
}
