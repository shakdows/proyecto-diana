'use client';

import { useRef, useState } from 'react';
import { Car, Check, Tractor, TriangleAlert } from 'lucide-react';
import { Field } from '@/components/ui/field';
import { Input, Select } from '@/components/ui/input';
import { Modal, ModalActions } from '@/components/ui/modal';
import {
  VEHICLE_VACIO,
  canSaveVehicle,
  checkMileage,
  checkPlate,
  checkYear,
  newVehicleId,
  normalizePlate,
  vehicleFromInput,
  type VehicleInput,
} from '@/features/vehicles/services/vehicle';
import type { DemoCustomer, DemoVehicle } from '@/features/customers/demo';
import { plateOwner } from '@/features/customers/services/edit';
import { displayName } from '@/features/customers/services/identity';
import { cn } from '@/lib/utils/cn';

/**
 * Alta de vehículo en la ficha del cliente.
 *
 * ── Por qué se piden tan pocas cosas ───────────────────────────────────────
 *
 * Solo la placa es obligatoria. Marca, modelo, año, color y kilometraje se
 * pueden dejar en blanco, y no por pereza: este formulario se abre con el
 * cliente delante diciendo «también tengo la camioneta», y lo único que hace
 * falta para que ese vehículo exista y se pueda buscar es la placa. El resto
 * se completa al recibirlo, cuando alguien lo tiene en la nave y puede leer el
 * tablero en vez de recordarlo.
 *
 * Pedirlo todo aquí no recoge más datos: recoge los mismos peor, porque quien
 * está de pie escribe cualquier cosa para salir del paso.
 *
 * ── Registrar no es recibir ────────────────────────────────────────────────
 *
 * Esto añade el vehículo a la cartera del cliente. NO abre una orden: la orden
 * nace en la recepción, con su checklist y su kilometraje de entrada. Darla
 * por abierta aquí metería en el taller un coche que nadie ha visto, y saldría
 * en el centro de operaciones como trabajo pendiente.
 */
export function NewVehicleModal(props: {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onCreate: (vehicle: DemoVehicle) => void;
  readonly customerName: string;
  readonly customers: readonly DemoCustomer[];
  readonly now: Date;
}) {
  /* Se monta al abrir: cancelar descarta lo tecleado en vez de dejar la placa
     a medias esperando a la próxima vez que alguien abra el formulario. */
  if (!props.open) return null;
  return <NewVehicleForm {...props} />;
}

function NewVehicleForm({
  onClose,
  onCreate,
  customerName,
  /** Para avisar si la placa ya es de otro, antes de duplicarla. */
  customers,
  now,
}: {
  readonly onClose: () => void;
  readonly onCreate: (vehicle: DemoVehicle) => void;
  readonly customerName: string;
  readonly customers: readonly DemoCustomer[];
  readonly now: Date;
}) {
  const placaRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<VehicleInput>(VEHICLE_VACIO);
  const [touched, setTouched] = useState(false);

  const set = <K extends keyof VehicleInput>(key: K, value: VehicleInput[K]): void => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const placaCheck = checkPlate(draft.plate);
  const añoCheck = checkYear(draft.modelYear, now);
  const kmCheck = checkMileage(draft.mileage);
  const puede = canSaveVehicle(draft, now);

  /* Quién tiene ya esta placa. Se mira mientras se escribe y NO bloquea: un
     vehículo puede cambiar de dueño, y quien lo tiene delante lo sabe. */
  const dueño = placaCheck.valid
    ? plateOwner(customers, normalizePlate(draft.plate))
    : undefined;

  const maquinaria = draft.equipmentKind === 'maquinaria';

  const crear = (): void => {
    setTouched(true);
    if (!puede) return;
    onCreate(vehicleFromInput(draft, newVehicleId(Date.now()), now));
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      onSubmit={crear}
      initialFocusRef={placaRef}
      title="Registrar vehículo"
      subtitle={`Se añade a la ficha de ${customerName}.`}
      footer={
        <ModalActions
          onCancel={onClose}
          confirmLabel="Registrar"
          confirmIcon={<Check aria-hidden className="size-4" />}
          disabled={!puede}
          hint="Lo demás se completa al recibirlo."
        />
      }
    >
      <fieldset>
        <legend className="sr-only">Qué es</legend>
        <div className="grid grid-cols-2 gap-1 rounded-control bg-surface-sunken p-1">
          {(
            [
              { kind: 'vehiculo' as const, icon: <Car />, label: 'Vehículo' },
              { kind: 'maquinaria' as const, icon: <Tractor />, label: 'Maquinaria' },
            ]
          ).map((o) => (
            <button
              key={o.kind}
              type="button"
              onClick={() => set('equipmentKind', o.kind)}
              aria-pressed={draft.equipmentKind === o.kind}
              className={cn(
                'flex h-10 items-center justify-center gap-2 rounded-[0.375rem] text-sm transition-colors duration-150',
                draft.equipmentKind === o.kind
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
        label={maquinaria ? 'Código o serie' : 'Placa'}
        required
        error={touched && !placaCheck.valid ? placaCheck.problem : undefined}
        hint={maquinaria ? 'Lo que esté escrito en la máquina.' : undefined}
      >
        <Input
          ref={placaRef}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          value={draft.plate}
          onChange={(e) => set('plate', e.target.value.toUpperCase())}
          placeholder={maquinaria ? 'CAT320D' : 'ABC-123'}
          className="font-mono font-bold tracking-[0.08em]"
        />
        {/*
          Avisa, no bloquea. Un vehículo cambia de dueño —se vende, pasa de la
          empresa al empleado—, y bloquear supondría que el sistema sabe más
          que quien tiene la tarjeta de propiedad delante. Lo que no puede
          pasar es que se cree el duplicado SIN que nadie lo vea.
        */}
        {dueño !== undefined && (
          <p className="flex items-start gap-1.5 text-xs text-warn-700">
            <TriangleAlert aria-hidden className="mt-px size-3.5 shrink-0" />
            <span>
              Esta placa ya está en la ficha de{' '}
              <span className="font-medium">{displayName(dueño)}</span>. Puedes registrarla igual si
              cambió de dueño.
            </span>
          </p>
        )}
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Marca">
          <Input
            value={draft.brand}
            onChange={(e) => set('brand', e.target.value)}
            placeholder={maquinaria ? 'Caterpillar' : 'Toyota'}
          />
        </Field>
        <Field label="Modelo">
          <Input
            value={draft.model}
            onChange={(e) => set('model', e.target.value)}
            placeholder={maquinaria ? '320D' : 'Hilux SRV'}
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field
          label="Año"
          error={touched && !añoCheck.valid ? añoCheck.problem : undefined}
        >
          <Input
            inputMode="numeric"
            value={draft.modelYear}
            onChange={(e) => set('modelYear', e.target.value)}
            placeholder={String(now.getFullYear() - 3)}
          />
        </Field>
        <Field label="Color">
          <Select value={draft.color} onChange={(e) => set('color', e.target.value)}>
            <option value="">Sin registrar</option>
            {['Blanco', 'Negro', 'Plata', 'Gris', 'Rojo', 'Azul', 'Verde', 'Amarillo', 'Otro'].map(
              (c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ),
            )}
          </Select>
        </Field>
        <Field
          label={maquinaria ? 'Horómetro' : 'Kilometraje'}
          error={touched && !kmCheck.valid ? kmCheck.problem : undefined}
        >
          <Input
            inputMode="numeric"
            value={draft.mileage}
            onChange={(e) => set('mileage', e.target.value)}
            placeholder={maquinaria ? '4 200' : '41 200'}
          />
        </Field>
      </div>
    </Modal>
  );
}
