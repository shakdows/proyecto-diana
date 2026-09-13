'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { EmptyState } from '@/components/feedback/states';
import { useToast } from '@/components/feedback/toast';
import { Skeleton } from '@/components/ui/skeleton';
import { NewVehicleModal } from '@/components/vehicles/new-vehicle-modal';
import type { DemoCustomer } from '@/features/customers/demo';
import { displayName } from '@/features/customers/services/identity';
import { formatPlate } from '@/features/vehicles/services/vehicle';
import {
  useAllCustomers,
  useCustomer,
  useRemoveCustomer,
} from '@/features/customers/use-created';
import { removalKind } from '@/features/customers/services/removal';
import { useHydrated } from '@/lib/demo/store';
import { CustomerProfile } from './customer-profile';
import { DeleteCustomerModal } from './delete-customer-modal';
import { EditCustomerModal } from './edit-customer-modal';

/**
 * La ficha, con lo que se puede tocar.
 *
 * ── Por qué la ficha entera es de cliente ──────────────────────────────────
 *
 * El cliente puede venir de dos sitios que el servidor no ve igual:
 *
 *   · SEMBRADO. Lo deriva el servidor de las órdenes abiertas y llega como
 *     propiedad. Encima puede haber ediciones hechas aquí —un teléfono
 *     corregido, un vehículo registrado— que viven en `localStorage`.
 *   · CREADO AQUÍ. No existe para el servidor en absoluto.
 *
 * En los dos casos hay algo que solo el navegador sabe, así que la ficha se
 * pinta en el navegador y el servidor solo aporta la base. Cuando haya base de
 * datos esto vuelve a ser un componente de servidor y el archivo se queda en
 * la mitad.
 */
export function CustomerProfileScreen({
  id,
  seeded,
  seededAll,
  corporateClients,
  now,
}: {
  readonly id: string;
  /** El del catálogo, si el servidor lo conoce. */
  readonly seeded: DemoCustomer | undefined;
  /** La cartera entera, para avisar si una placa ya es de otro. */
  readonly seededAll: readonly DemoCustomer[];
  readonly corporateClients: readonly string[];
  readonly now: Date;
}) {
  const { customer, editFields, addVehicle } = useCustomer(id, seeded);
  const { customers } = useAllCustomers(seededAll);
  const removeCustomer = useRemoveCustomer();
  const hydrated = useHydrated();
  const toast = useToast();
  const router = useRouter();

  const [editando, setEditando] = useState(false);
  const [registrando, setRegistrando] = useState(false);
  const [borrando, setBorrando] = useState(false);

  /*
   * Antes de hidratar no se sabe si un cliente creado aquí existe: lo suyo
   * está en `localStorage`, que no se lee en el servidor. Decidir con esa
   * primera instantánea enseñaría «no encontrado» durante un fotograma y el
   * contenido justo después.
   */
  if (!hydrated && seeded === undefined) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (customer === undefined) {
    return (
      <div className="space-y-6">
        <Link
          href="/clientes"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-fg-muted transition-colors duration-150 hover:text-fg"
        >
          <ArrowLeft aria-hidden className="size-4" />
          Clientes
        </Link>
        <EmptyState
          title="Este cliente no está aquí"
          hint="Los clientes creados durante la prueba viven en el navegador donde se crearon. Si lo diste de alta en otro equipo —o usaste «Comenzar de nuevo»—, ya no está."
        />
      </div>
    );
  }

  return (
    <>
      <CustomerProfile
        customer={customer}
        now={now}
        onEdit={() => setEditando(true)}
        onAddVehicle={() => setRegistrando(true)}
        onDelete={() => setBorrando(true)}
      />

      <DeleteCustomerModal
        open={borrando}
        onClose={() => setBorrando(false)}
        customer={customer}
        onConfirm={() => {
          /*
           * FASE 3: aquí va la Server Action que comprueba `customers:delete`,
           * pasa por RLS, escribe en `audit_logs` y ARCHIVA en vez de borrar
           * —un cliente con órdenes no se borra, o los informes dejan de
           * cuadrar—. Ver `services/removal.ts`.
           */
          const quitado = removalKind(customer.id);
          removeCustomer(customer.id);
          toast(
            quitado === 'creado'
              ? `${displayName(customer)} se eliminó de este navegador.`
              : `${displayName(customer)} deja de aparecer aquí. Vuelve con «Comenzar de nuevo».`,
            'ok',
          );
          /* Fuera de la ficha de alguien que ya no está: quedarse la dejaría
             pintada entera, que es exactamente lo contrario de lo que acaba
             de pasar. */
          router.push('/clientes');
        }}
      />

      <EditCustomerModal
        open={editando}
        onClose={() => setEditando(false)}
        customer={customer}
        corporateClients={corporateClients}
        onSave={(fields) => {
          // FASE 3: aquí va la Server Action que actualiza con RLS y deja
          // rastro en la auditoría —quién cambió qué y cuándo—.
          editFields(fields);
          toast('Datos actualizados en este navegador.', 'ok');
        }}
      />

      <NewVehicleModal
        open={registrando}
        onClose={() => setRegistrando(false)}
        customerName={displayName(customer)}
        customers={customers}
        now={now}
        onCreate={(vehicle) => {
          addVehicle(vehicle);
          toast(
            `${formatPlate(vehicle.plate)} queda en la ficha. Para meterlo al taller, abre una recepción.`,
            'ok',
          );
        }}
      />
    </>
  );
}
