'use client';

import { useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Car,
  Check,
  Plus,
  Tractor,
  TriangleAlert,
  UserRound,
} from 'lucide-react';
import { Field } from '@/components/ui/field';
import { Input, Select } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import type { DemoCustomer, DemoVehicle } from '@/features/customers/demo';
import { toSearchable } from '@/features/customers/demo';
import {
  NUEVA_EMPRESA,
  checkCorporateName,
  resolveCorporate,
} from '@/features/customers/services/corporate';
import { plateOwner } from '@/features/customers/services/edit';
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
  LICENSE_CATEGORIES,
  canSaveLicense,
  checkExpiry,
  checkLicenseNumber,
  licenseFrom,
  type DriverLicense,
} from '@/features/customers/services/license';
import { DUPLICATE_LABELS, findDuplicates } from '@/features/customers/services/search';
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
  /** La empresa corporativa ya resuelta, o `null`. */
  readonly corporateClient: string | null;
  /** `true` si además hay que dar de alta esa empresa. */
  readonly corporateClientIsNew: boolean;
  /** El vehículo con el que llega, si se registró. */
  readonly vehicle: DemoVehicle | null;
  /** La licencia de quien conduce, si se registró. */
  readonly license: DriverLicense | null;
}

/** Lo que la pantalla tiene escrito, que no es lo mismo que lo que se guarda. */
interface FormState {
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
  /** `''`, un nombre del catálogo, o el centinela de «otra empresa». */
  readonly corporatePick: string;
  readonly corporateTyped: string;
  readonly vehicle: VehicleInput;
  readonly licenseNumber: string;
  readonly licenseCategory: string;
  readonly licenseExpiry: string;
  readonly licenseRestrictions: string;
}

const VACIO: FormState = {
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
  corporatePick: '',
  corporateTyped: '',
  vehicle: VEHICLE_VACIO,
  licenseNumber: '',
  licenseCategory: 'A-I',
  licenseExpiry: '',
  licenseRestrictions: '',
};

type Paso = 'cliente' | 'vehiculo' | 'licencia';
const PASOS: readonly { id: Paso; label: string }[] = [
  { id: 'cliente', label: 'Cliente' },
  { id: 'vehiculo', label: 'Vehículo' },
  { id: 'licencia', label: 'Licencia' },
];

/**
 * Alta de cliente, en tres pasos.
 *
 * Se abre desde `/clientes` y también desde la recepción. Ese segundo caso es
 * el que manda en el diseño: el asesor tiene el vehículo delante, descubre que
 * el cliente no existe, y mandarlo a otra página completa le hace perder la
 * recepción a medias. Aquí crea, cierra y sigue donde estaba.
 *
 * ── Por qué tres pasos y no un formulario largo ────────────────────────────
 *
 * Porque son tres cosas distintas —quién es, qué trae, qué puede conducir— y
 * el alta tiene que servir a dos situaciones opuestas:
 *
 *   · POR TELÉFONO. «Apúntame, mañana llevo el coche.» No hay placa que
 *     teclear ni licencia que mirar. Con un formulario único de quince campos,
 *     el asesor rellena cuatro y deja once vacíos preguntándose si puede.
 *   · EN EL MOSTRADOR. El cliente está delante con el DNI, la tarjeta de
 *     propiedad y la licencia en la mano. Es el ÚNICO momento en que esos
 *     datos están todos juntos; no pedirlos aquí es no tenerlos nunca, porque
 *     nadie llama a un cliente para preguntarle el vencimiento de su licencia.
 *
 * Con pasos, el primero basta para existir y los otros dos están a un clic
 * para quien los tiene delante. El botón dice cuál de las dos cosas va a pasar
 * —«Continuar» o «Crear sin vehículo»—, así que nunca hay que adivinar si
 * saltarse algo pierde datos.
 *
 * ── El aviso de duplicado ──────────────────────────────────────────────────
 *
 * Aparece mientras se escribe y NO bloquea. Bloquear supondría que el sistema
 * está seguro, y aquí solo compara los tres últimos dígitos del documento
 * —lo único que la pantalla puede ver—. Quien está delante del cliente sabe
 * mejor que el sistema si es la misma persona.
 */
export function NewCustomerModal(props: {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onCreate: (draft: NewCustomerDraft) => void;
  /** La cartera: para avisar de duplicados y de placas ya registradas. */
  readonly customers: readonly DemoCustomer[];
  readonly corporateClients: readonly string[];
  readonly now: Date;
  /** Documento ya tecleado en la pantalla anterior, si lo hay. */
  readonly initialDocument?: string;
}) {
  /* Se monta al abrir: cada alta parte en blanco y en el primer paso, sin un
     efecto que reinicie el estado después de haberlo pintado. */
  if (!props.open) return null;
  return <NewCustomerForm {...props} />;
}

function NewCustomerForm({
  onClose,
  onCreate,
  customers,
  corporateClients,
  now,
  initialDocument,
}: {
  readonly onClose: () => void;
  readonly onCreate: (draft: NewCustomerDraft) => void;
  readonly customers: readonly DemoCustomer[];
  readonly corporateClients: readonly string[];
  readonly now: Date;
  readonly initialDocument?: string;
}) {
  const primero = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<FormState>({
    ...VACIO,
    document: initialDocument ?? '',
  });
  const [paso, setPaso] = useState<Paso>('cliente');
  const [touched, setTouched] = useState(false);
  /** Mientras guarda. Es lo que impide el doble envío. */
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]): void => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };
  const setVehicle = <K extends keyof VehicleInput>(key: K, value: VehicleInput[K]): void => {
    setDraft((prev) => ({ ...prev, vehicle: { ...prev.vehicle, [key]: value } }));
  };

  const empresa = draft.kind === 'empresa';
  const docCheck = checkDocument(draft.documentType, draft.document);
  const phoneCheck = checkPhone(draft.phone);
  const emailCheck = checkEmail(draft.email);

  const escribiendoEmpresa = draft.corporatePick === NUEVA_EMPRESA;
  const empresaCheck = checkCorporateName(draft.corporateTyped);
  const empresaElegida = resolveCorporate(
    corporateClients,
    draft.corporatePick,
    draft.corporateTyped,
  );
  const empresaLista = !escribiendoEmpresa || empresaCheck.valid;

  const nombreListo = empresa ? draft.businessName.trim() !== '' : draft.firstName.trim() !== '';
  const clienteListo =
    docCheck.valid && nombreListo && phoneCheck.valid && emailCheck.valid && empresaLista;

  /* El vehículo se puede omitir entero, pero no a medias: una placa sin año
     vale; un año sin placa no crea ningún vehículo y la pantalla mentiría. */
  const hayVehiculo = draft.vehicle.plate.trim() !== '';
  const vehiculoListo = !hayVehiculo || canSaveVehicle(draft.vehicle, now);
  const placaCheck = checkPlate(draft.vehicle.plate);
  const añoCheck = checkYear(draft.vehicle.modelYear, now);
  const kmCheck = checkMileage(draft.vehicle.mileage);
  const maquinaria = draft.vehicle.equipmentKind === 'maquinaria';
  const dueño =
    hayVehiculo && placaCheck.valid
      ? plateOwner(customers, normalizePlate(draft.vehicle.plate))
      : undefined;

  const hayLicencia = draft.licenseNumber.trim() !== '';
  const licenciaListo = canSaveLicense(draft.licenseNumber, draft.licenseExpiry);
  const licCheck = checkLicenseNumber(draft.licenseNumber);
  const vencCheck = checkExpiry(draft.licenseExpiry);

  const searchable = useMemo(() => customers.map(toSearchable), [customers]);
  const duplicates = useMemo(
    () =>
      findDuplicates(searchable, {
        documentType: draft.documentType,
        documentLast: draft.document,
        phone: draft.phone,
        email: draft.email,
      }),
    [searchable, draft.documentType, draft.document, draft.phone, draft.email],
  );

  const pasoListo =
    paso === 'cliente' ? clienteListo : paso === 'vehiculo' ? vehiculoListo : licenciaListo;

  const avanzar = (): void => {
    setTouched(true);
    if (!pasoListo) return;
    setTouched(false);
    setPaso(paso === 'cliente' ? 'vehiculo' : 'licencia');
  };

  const crear = (): void => {
    setTouched(true);
    if (!clienteListo || !vehiculoListo || !licenciaListo || saving) return;
    setSaving(true);
    onCreate({
      kind: draft.kind,
      documentType: draft.documentType,
      document: draft.document,
      firstName: draft.firstName,
      lastName: draft.lastName,
      businessName: draft.businessName,
      tradeName: draft.tradeName,
      contactName: draft.contactName,
      phone: draft.phone,
      email: draft.email,
      corporateClient: empresaElegida.name,
      corporateClientIsNew: empresaElegida.isNew,
      vehicle: hayVehiculo
        ? vehicleFromInput(draft.vehicle, newVehicleId(Date.now()), now)
        : null,
      license: licenseFrom(
        draft.licenseNumber,
        draft.licenseCategory,
        draft.licenseExpiry,
        draft.licenseRestrictions,
      ),
    });
    setSaving(false);
    onClose();
  };

  const indice = PASOS.findIndex((p) => p.id === paso);
  const ultimo = paso === 'licencia';

  return (
    <Modal
      open
      onClose={onClose}
      onSubmit={ultimo ? crear : avanzar}
      initialFocusRef={primero}
      title="Nuevo cliente"
      subtitle={SUBTITULOS[paso]}
      footer={
        <>
          {/* «Crear ahora» no está escondido en un menú: es la salida del
              asesor que tiene a alguien esperando, y tiene que verse desde el
              primer paso. Dice lo que se va a perder, no «omitir». */}
          <div className="hidden min-w-0 flex-1 sm:block">
            {!ultimo && clienteListo && (
              <button
                type="button"
                onClick={crear}
                className="text-sm font-medium text-fg-muted underline-offset-4 transition-colors duration-150 hover:text-fg hover:underline"
              >
                {hayVehiculo ? 'Crear sin licencia' : 'Crear solo el cliente'}
              </button>
            )}
          </div>

          <div className="flex flex-1 gap-3 sm:flex-none">
            <button
              type="button"
              onClick={() => {
                if (indice === 0) onClose();
                else {
                  setTouched(false);
                  setPaso(PASOS[indice - 1]?.id ?? 'cliente');
                }
              }}
              className="inline-flex h-11 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-control border border-border-strong px-4 text-sm font-semibold text-fg transition-colors duration-150 hover:bg-surface-sunken sm:flex-none sm:px-5"
            >
              {indice === 0 ? (
                'Cancelar'
              ) : (
                <>
                  <ArrowLeft aria-hidden className="size-4" />
                  Atrás
                </>
              )}
            </button>

            <button
              type="submit"
              disabled={!pasoListo || saving}
              className={cn(
                'inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-control text-sm font-semibold',
                'whitespace-nowrap px-4 sm:px-5',
                'transition-colors duration-150 sm:flex-none',
                pasoListo && !saving
                  ? 'bg-romero-500 text-white hover:bg-romero-600 active:scale-[0.98]'
                  : 'cursor-not-allowed bg-surface-sunken text-fg-subtle',
              )}
            >
              {ultimo ? (
                <>
                  <Check aria-hidden className="size-4" />
                  {saving ? 'Creando…' : 'Crear cliente'}
                </>
              ) : (
                <>
                  Continuar
                  <ArrowRight aria-hidden className="size-4" />
                </>
              )}
            </button>
          </div>
        </>
      }
    >
      <Stepper actual={indice} />

      {paso === 'cliente' && (
        <>
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
                <Segmento
                  key={o.kind}
                  active={draft.kind === o.kind}
                  icon={o.icon}
                  label={o.label}
                  onClick={() => {
                    setDraft((prev) => ({ ...prev, kind: o.kind, documentType: o.doc }));
                  }}
                />
              ))}
            </div>
          </fieldset>

          <Field
            label={empresa ? 'RUC' : 'Documento'}
            required
            error={touched && !docCheck.valid ? docCheck.problem : undefined}
          >
            <Input
              ref={primero}
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

          {/*
            La lista de empresas NO se cierra. El catálogo lo mantiene
            administración, pero el cliente está delante y la empresa que lo
            manda puede haber firmado esta semana. Con la lista cerrada, el
            asesor solo puede dejarlo en «sin empresa» y avisar a alguien —y
            ese aviso no llega—: el dato se pierde cuando alguien lo tenía.
          */}
          <Field
            label="Empresa corporativa"
            hint={escribiendoEmpresa ? undefined : 'Solo si pertenece a un cliente corporativo.'}
          >
            <Select
              value={draft.corporatePick}
              onChange={(e) => set('corporatePick', e.target.value)}
            >
              <option value="">Sin empresa corporativa</option>
              {corporateClients.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
              <option value={NUEVA_EMPRESA}>Otra empresa…</option>
            </Select>
          </Field>

          {escribiendoEmpresa && (
            <Field
              label="Nombre de la empresa"
              required
              error={touched && !empresaCheck.valid ? empresaCheck.problem : undefined}
              hint={
                draft.corporateTyped.trim() === ''
                  ? 'Se dará de alta con el cliente. Administración completará su RUC y su acuerdo.'
                  : undefined
              }
            >
              <Input
                autoFocus
                autoComplete="organization"
                value={draft.corporateTyped}
                onChange={(e) => set('corporateTyped', e.target.value)}
                placeholder="Scotiabank"
              />
              {/* Escribir «mitsui» cuando ya existe «Mitsui» no es un error:
                  se reconoce y se dice cuál se usa, en vez de pararlo. */}
              {empresaElegida.matched !== undefined && (
                <p className="flex items-start gap-1.5 text-xs text-ok-700">
                  <Check aria-hidden className="mt-px size-3.5 shrink-0" />
                  <span>
                    <span className="font-medium">{empresaElegida.matched}</span> ya está en la
                    lista: se usará esa y no se crea una nueva.
                  </span>
                </p>
              )}
              {empresaElegida.isNew && (
                <p className="flex items-start gap-1.5 text-xs text-fg-muted">
                  <Plus aria-hidden className="mt-px size-3.5 shrink-0" />
                  <span>
                    Se creará la empresa <span className="font-medium">{empresaElegida.name}</span>.
                  </span>
                </p>
              )}
            </Field>
          )}

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
        </>
      )}

      {paso === 'vehiculo' && (
        <>
          <fieldset>
            <legend className="sr-only">Qué trae</legend>
            <div className="grid grid-cols-2 gap-1 rounded-control bg-surface-sunken p-1">
              {(
                [
                  { kind: 'vehiculo' as const, icon: <Car />, label: 'Vehículo' },
                  { kind: 'maquinaria' as const, icon: <Tractor />, label: 'Maquinaria' },
                ]
              ).map((o) => (
                <Segmento
                  key={o.kind}
                  active={draft.vehicle.equipmentKind === o.kind}
                  icon={o.icon}
                  label={o.label}
                  onClick={() => setVehicle('equipmentKind', o.kind)}
                />
              ))}
            </div>
          </fieldset>

          <Field
            label={maquinaria ? 'Código o serie' : 'Placa'}
            error={touched && hayVehiculo && !placaCheck.valid ? placaCheck.problem : undefined}
            hint={
              hayVehiculo
                ? undefined
                : 'Si todavía no la tienes, deja este paso en blanco y regístralo después.'
            }
          >
            <Input
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              value={draft.vehicle.plate}
              onChange={(e) => setVehicle('plate', e.target.value.toUpperCase())}
              placeholder={maquinaria ? 'CAT320D' : 'ABC-123'}
              className="font-mono font-bold tracking-[0.08em]"
            />
            {/* Avisa, no bloquea: un vehículo cambia de dueño, y quien tiene
                la tarjeta de propiedad delante lo sabe. */}
            {dueño !== undefined && (
              <p className="flex items-start gap-1.5 text-xs text-warn-700">
                <TriangleAlert aria-hidden className="mt-px size-3.5 shrink-0" />
                <span>
                  Esta placa ya está en la ficha de{' '}
                  <span className="font-medium">{displayName(dueño)}</span>. Puedes registrarla
                  igual si cambió de dueño.
                </span>
              </p>
            )}
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Marca">
              <Input
                value={draft.vehicle.brand}
                onChange={(e) => setVehicle('brand', e.target.value)}
                placeholder={maquinaria ? 'Caterpillar' : 'Toyota'}
              />
            </Field>
            <Field label="Modelo">
              <Input
                value={draft.vehicle.model}
                onChange={(e) => setVehicle('model', e.target.value)}
                placeholder={maquinaria ? '320D' : 'Hilux SRV'}
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Año" error={touched && !añoCheck.valid ? añoCheck.problem : undefined}>
              <Input
                inputMode="numeric"
                value={draft.vehicle.modelYear}
                onChange={(e) => setVehicle('modelYear', e.target.value)}
                placeholder={String(now.getFullYear() - 3)}
              />
            </Field>
            <Field label="Color">
              <Select
                value={draft.vehicle.color}
                onChange={(e) => setVehicle('color', e.target.value)}
              >
                <option value="">Sin registrar</option>
                {COLORES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label={maquinaria ? 'Horómetro' : 'Kilometraje'}
              error={touched && !kmCheck.valid ? kmCheck.problem : undefined}
            >
              <Input
                inputMode="numeric"
                value={draft.vehicle.mileage}
                onChange={(e) => setVehicle('mileage', e.target.value)}
                placeholder={maquinaria ? '4 200' : '41 200'}
              />
            </Field>
          </div>

          {/* Registrar no es recibir: el vehículo entra a la ficha, no al
              taller. La orden nace en la recepción, con su checklist. */}
          <p className="text-xs text-fg-subtle">
            El vehículo queda en su ficha. Para meterlo al taller, abre una recepción.
          </p>
        </>
      )}

      {paso === 'licencia' && (
        <>
          <Field
            label="Número de licencia"
            error={touched && hayLicencia && !licCheck.valid ? licCheck.problem : undefined}
            hint={
              hayLicencia
                ? undefined
                : empresa
                  ? 'La de quien conduce habitualmente. Puedes dejarlo en blanco.'
                  : 'Puedes dejarlo en blanco y completarlo cuando la traiga.'
            }
          >
            <Input
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              value={draft.licenseNumber}
              onChange={(e) => set('licenseNumber', e.target.value.toUpperCase())}
              placeholder="Q43802725"
              className="font-mono tracking-[0.06em]"
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Categoría">
              <Select
                value={draft.licenseCategory}
                onChange={(e) => set('licenseCategory', e.target.value)}
              >
                {LICENSE_CATEGORIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} · {c.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label="Vence"
              hint="Es el dato que decide si puede hacer la prueba de ruta."
              error={touched && !vencCheck.valid ? vencCheck.problem : undefined}
            >
              <Input
                type="date"
                value={draft.licenseExpiry}
                onChange={(e) => set('licenseExpiry', e.target.value)}
              />
            </Field>
          </div>

          <Field label="Restricciones" hint="Lo que diga el plástico: lentes, prótesis…">
            <Input
              value={draft.licenseRestrictions}
              onChange={(e) => set('licenseRestrictions', e.target.value)}
              placeholder="Lentes correctores"
            />
          </Field>
        </>
      )}
    </Modal>
  );
}

const SUBTITULOS: Readonly<Record<Paso, string>> = {
  cliente: 'Quién es. Es lo único obligatorio.',
  vehiculo: 'Qué trae. Puedes saltarlo y registrarlo después.',
  licencia: 'Qué puede conducir. También es opcional.',
};

const COLORES: readonly string[] = [
  'Blanco',
  'Negro',
  'Plata',
  'Gris',
  'Rojo',
  'Azul',
  'Verde',
  'Amarillo',
  'Otro',
];

/**
 * Dónde estamos y cuánto queda.
 *
 * Un formulario por pasos sin esto es un formulario que no se sabe cuándo
 * acaba, y quien no sabe cuándo acaba abandona en el segundo.
 */
function Stepper({ actual }: { readonly actual: number }) {
  return (
    <ol className="flex items-center gap-1.5" aria-label="Pasos del alta">
      {PASOS.map((p, i) => {
        const hecho = i < actual;
        const activo = i === actual;
        return (
          <li key={p.id} className="flex min-w-0 flex-1 items-center gap-1.5">
            <span
              aria-hidden
              className={cn(
                'grid size-6 shrink-0 place-items-center rounded-full text-xs font-semibold',
                activo
                  ? 'bg-graphite-950 text-white'
                  : hecho
                    ? 'bg-ok-100 text-ok-700'
                    : 'bg-surface-sunken text-fg-subtle',
              )}
            >
              {hecho ? <Check className="size-3.5" /> : i + 1}
            </span>
            <span
              className={cn(
                'truncate text-xs',
                activo ? 'font-semibold text-fg' : 'text-fg-subtle',
              )}
              aria-current={activo ? 'step' : undefined}
            >
              {p.label}
            </span>
            {i < PASOS.length - 1 && (
              <span aria-hidden className="h-px min-w-2 flex-1 bg-border" />
            )}
          </li>
        );
      })}
    </ol>
  );
}

function Segmento({
  active,
  icon,
  label,
  onClick,
}: {
  readonly active: boolean;
  readonly icon: React.ReactNode;
  readonly label: string;
  readonly onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'flex h-10 items-center justify-center gap-2 rounded-[0.375rem] text-sm transition-colors duration-150',
        active
          ? 'bg-graphite-950 font-semibold text-white shadow-raise'
          : 'text-fg-muted hover:text-fg',
      )}
    >
      <span aria-hidden className="[&>svg]:size-4">
        {icon}
      </span>
      {label}
    </button>
  );
}
