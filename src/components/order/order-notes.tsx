'use client';

import { useCallback, useMemo, useState } from 'react';
import { MessageSquarePlus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Textarea } from '@/components/ui/input';
import { Modal, ModalActions } from '@/components/ui/modal';
import { useToast } from '@/components/feedback/toast';
import { usePersistentStateChecked, useHydrated } from '@/lib/demo/store';
import {
  MAX_NOTE,
  checkNote,
  newestFirst,
  noteFrom,
  noteSlot,
  readNotes,
  type WorkshopNote,
} from '@/features/orders/services/notes';

const VACIO: readonly WorkshopNote[] = [];

/**
 * Las notas del taller, que ahora se pueden escribir.
 *
 * «Agregar nota» era un botón sin `onClick`, igual que «Agregar foto» antes
 * de que tomara fotos de verdad. La nota del taller es el registro que se lee
 * meses después, cuando el cliente vuelve preguntando por qué no se cambió el
 * disco: si el botón no guarda nada, esa conversación se pierde.
 *
 * Una nota guardada NO se edita ni se borra: se corrige escribiendo otra. Un
 * registro reescribible no respalda nada.
 */
export function OrderNotes({
  orderId,
  author,
  seeded,
}: {
  readonly orderId: string;
  readonly author: string;
  /** Las notas de la demostración, que llegan ya resueltas desde el servidor. */
  readonly seeded: readonly WorkshopNote[];
}) {
  const [stored, setStored] = usePersistentStateChecked<readonly WorkshopNote[]>(
    noteSlot(orderId),
    VACIO,
  );
  const hydrated = useHydrated();
  const toast = useToast();

  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const propias = useMemo(() => readNotes(stored), [stored]);
  const todas = useMemo(() => newestFirst([...seeded, ...propias]), [seeded, propias]);

  const close = useCallback(() => {
    setOpen(false);
    setText('');
    setError(null);
  }, []);

  const save = useCallback((): void => {
    const check = checkNote(text);
    if (!check.valid) {
      setError(check.error ?? 'Escribe la nota antes de guardar.');
      return;
    }
    const note = noteFrom(text, author, new Date(), Math.random());
    if (note === null) return;

    const guardado = setStored((prev) => [...prev, note]);
    /*
     * `localStorage` falla EN SILENCIO al llenarse. Sin mirar el resultado, la
     * nota aparecería en la lista y desaparecería al recargar, que es la peor
     * de las dos posibilidades: creer que quedó escrita.
     */
    toast(
      guardado
        ? 'Nota guardada'
        : 'La nota se ve en pantalla pero no cabe en el almacén: no sobrevivirá a la recarga.',
      guardado ? 'ok' : 'crit',
    );
    close();
  }, [text, author, setStored, toast, close]);

  return (
    <section className="rounded-panel border border-border bg-surface-raised">
      <header className="flex items-center justify-between gap-3 px-5 py-4">
        <h2 className="font-display text-base font-semibold tracking-tight text-fg">
          Notas del taller
        </h2>
        <span data-numeric className="text-xs text-fg-subtle">
          {hydrated ? todas.length : seeded.length}
        </span>
      </header>

      <div className="px-5 pb-5">
        {todas.length === 0 ? (
          <p className="py-6 text-center text-sm text-fg-subtle">Sin notas registradas.</p>
        ) : (
          <ul className="space-y-3">
            {todas.map((note) => (
              <li key={note.id} className="rounded-control bg-surface-sunken p-3.5">
                <p className="whitespace-pre-line text-sm leading-relaxed text-fg-muted">
                  {note.text}
                </p>
                <p data-numeric className="mt-2 text-xs text-fg-subtle">
                  {new Date(note.at).toLocaleString('es-PE', {
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}{' '}
                  · {note.author}
                </p>
              </li>
            ))}
          </ul>
        )}

        <Button
          type="button"
          variant="secondary"
          size="sm"
          block
          className="mt-3"
          onClick={() => setOpen(true)}
        >
          <Plus aria-hidden className="size-3.5" />
          Agregar nota
        </Button>
      </div>

      <Modal
        open={open}
        onClose={close}
        width="sm"
        title="Nueva nota del taller"
        subtitle="Queda con tu nombre y la hora. No se puede editar después."
        onSubmit={save}
        footer={
          <ModalActions
            onCancel={close}
            confirmLabel="Guardar nota"
            confirmIcon={<MessageSquarePlus aria-hidden className="size-4" />}
            disabled={!checkNote(text).valid}
            hint={`${text.trim().length} / ${MAX_NOTE}`}
          />
        }
      >
        <Field
          label="Nota"
          error={error ?? undefined}
          hint="Lo que haya que poder leer dentro de seis meses: qué se encontró, qué se recomendó, qué decidió el cliente."
        >
          <Textarea
            rows={5}
            value={text}
            maxLength={MAX_NOTE + 50}
            onChange={(e) => {
              setText(e.target.value);
              setError(null);
            }}
            placeholder="Discos con desgaste leve. Se recomendó rectificarlos; el cliente decidió esperar a la próxima visita."
          />
        </Field>
      </Modal>
    </section>
  );
}
