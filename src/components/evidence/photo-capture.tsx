'use client';

import { useEffect, useRef, useState } from 'react';
import { Camera, ImagePlus, Trash2, TriangleAlert, X } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import {
  MAX_PHOTOS,
  addPhotos,
  formatBytes,
  photoWhen,
  removePhoto,
  roomLeft,
  slotFor,
  totalBytes,
  type EvidencePhoto,
} from '@/features/evidence/services/photos';
import {
  closeCamera,
  isCaptureError,
  openCamera,
  photoFromFile,
  photoFromVideo,
  prefersSystemCamera,
} from '@/lib/media/capture';
import { usePersistentStateChecked } from '@/lib/demo/store';
import { cn } from '@/lib/utils/cn';

const NINGUNA: readonly EvidencePhoto[] = [];

/**
 * Las fotos de una cosa concreta: una zona dañada, un punto del checklist,
 * un defecto de calidad.
 *
 * ── Tomar foto es tomar foto ───────────────────────────────────────────────
 *
 * Hasta ahora el botón «Agregar foto» sumaba uno a un contador y no había
 * ninguna foto en ninguna parte. Un contador que sube da EXACTAMENTE la misma
 * señal que una foto guardada —«ya está»—, así que nadie descubre que no hay
 * nada hasta que el cliente vuelve reclamando un golpe y no hay qué enseñar.
 *
 * ── Móvil y computadora no se resuelven igual ──────────────────────────────
 *
 * · En móvil o tablet se abre la CÁMARA DEL SISTEMA. Enfoca mejor, tiene
 *   flash y es la que quien sostiene el aparato ya sabe usar. Un visor hecho
 *   a mano dentro de una web es peor en todo salvo en verse igual en las dos
 *   plataformas, y eso no le importa a nadie en un taller.
 * · En computadora se abre un visor con la webcam, y si no hay cámara o no
 *   se da permiso se dice y queda subir el archivo.
 *
 * «Subir imagen» está SIEMPRE, en los dos casos: la foto buena muchas veces
 * ya está en el teléfono o la mandó el cliente por WhatsApp.
 */
export function PhotoCapture({
  anchor,
  title,
  hint,
  onCountChange,
}: {
  /** Qué se está fotografiando. Decide dónde se guarda. */
  readonly anchor: string;
  readonly title: string;
  readonly hint?: string;
  readonly onCountChange?: (count: number) => void;
}) {
  const [photos, setPhotos] = usePersistentStateChecked<readonly EvidencePhoto[]>(
    slotFor(anchor),
    NINGUNA,
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [visor, setVisor] = useState(false);
  const [viendo, setViendo] = useState<EvidencePhoto | null>(null);

  const camaraRef = useRef<HTMLInputElement>(null);
  const archivoRef = useRef<HTMLInputElement>(null);

  const caben = roomLeft(photos);
  const lleno = caben === 0;

  const guardar = (nuevas: readonly EvidencePhoto[]): void => {
    if (nuevas.length === 0) return;
    const ok = setPhotos((prev) => addPhotos(prev, nuevas));
    /* El cupo del navegador es de unos 5 MB para TODO. Si no cupo hay que
       decirlo: la miniatura ya está en pantalla y sin este aviso quien la ve
       da por hecho que quedó guardada. */
    setError(
      ok
        ? null
        : 'No cupo en el navegador. Borra alguna foto o usa «Comenzar de nuevo» para liberar espacio.',
    );
    if (ok) onCountChange?.(Math.min(photos.length + nuevas.length, MAX_PHOTOS));
  };

  const desdeArchivos = async (
    files: FileList | null,
    source: EvidencePhoto['source'],
  ): Promise<void> => {
    if (files === null || files.length === 0) return;
    setBusy(true);
    setError(null);

    const nuevas: EvidencePhoto[] = [];
    /* Se corta por lo que CABE y no por lo que se eligió: seleccionar veinte
       archivos no puede tirar el cupo entero del navegador. */
    for (const file of Array.from(files).slice(0, caben)) {
      const r = await photoFromFile(file, source);
      if (isCaptureError(r)) setError(r.message);
      else nuevas.push(r);
    }
    guardar(nuevas);
    setBusy(false);
  };

  const tomarFoto = async (): Promise<void> => {
    setError(null);
    if (prefersSystemCamera()) {
      camaraRef.current?.click();
      return;
    }
    const stream = await openCamera();
    if (isCaptureError(stream)) {
      setError(stream.message);
      return;
    }
    closeCamera(stream);
    setVisor(true);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => void tomarFoto()}
          disabled={lleno || busy}
          className={cn(
            'inline-flex h-11 items-center gap-2 rounded-control px-3.5 text-sm font-semibold',
            'transition-colors duration-150',
            lleno || busy
              ? 'cursor-not-allowed bg-surface-sunken text-fg-subtle'
              : 'bg-graphite-950 text-white hover:bg-graphite-800 active:scale-[0.98]',
          )}
        >
          <Camera aria-hidden className="size-4" />
          {busy ? 'Procesando…' : 'Tomar foto'}
        </button>

        <button
          type="button"
          onClick={() => archivoRef.current?.click()}
          disabled={lleno || busy}
          className={cn(
            'inline-flex h-11 items-center gap-2 rounded-control border px-3.5 text-sm font-medium',
            'transition-colors duration-150',
            lleno || busy
              ? 'cursor-not-allowed border-border text-fg-subtle'
              : 'border-border-strong text-fg hover:bg-surface-sunken',
          )}
        >
          <ImagePlus aria-hidden className="size-4" />
          Subir imagen
        </button>

        <span data-numeric className="ml-auto text-xs text-fg-subtle">
          {photos.length} de {MAX_PHOTOS}
          {photos.length > 0 && ` · ${formatBytes(totalBytes(photos))}`}
        </span>
      </div>

      {/*
        Los dos son el MISMO control con una diferencia: `capture` le dice al
        móvil que abra la cámara en vez del carrete. En una computadora ese
        atributo no hace nada y abre el selector de archivos, que es
        exactamente lo que se quiere ahí.
      */}
      <input
        ref={camaraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={(e) => {
          void desdeArchivos(e.target.files, 'camara');
          e.target.value = '';
        }}
      />
      <input
        ref={archivoRef}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        onChange={(e) => {
          void desdeArchivos(e.target.files, 'archivo');
          e.target.value = '';
        }}
      />

      {hint !== undefined && photos.length === 0 && (
        <p className="text-xs text-fg-subtle">{hint}</p>
      )}

      {lleno && (
        <p className="text-xs text-fg-muted">
          Ya hay {MAX_PHOTOS} fotos. Borra alguna para añadir otra.
        </p>
      )}

      {error !== null && (
        <p className="flex items-start gap-1.5 text-xs text-crit-700">
          <TriangleAlert aria-hidden className="mt-px size-3.5 shrink-0" />
          <span>{error}</span>
        </p>
      )}

      {photos.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {photos.map((photo) => (
            <li key={photo.id} className="relative">
              <button
                type="button"
                onClick={() => setViendo(photo)}
                className="block overflow-hidden rounded-control border border-border transition-shadow duration-150 hover:shadow-panel"
              >
                {/* `<img>` y no `next/image`: es un `data:` URL que vive en
                    este navegador, no un archivo que el optimizador pueda
                    servir. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.dataUrl}
                  alt={`${title} · ${photoWhen(photo.takenAt, new Date())}`}
                  className="h-20 w-28 object-cover"
                />
                <span className="block bg-surface-sunken px-1.5 py-1 text-[0.625rem] text-fg-subtle">
                  {photoWhen(photo.takenAt, new Date())}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPhotos((prev) => removePhoto(prev, photo.id));
                  setError(null);
                  onCountChange?.(photos.length - 1);
                }}
                aria-label={`Borrar la foto de ${photoWhen(photo.takenAt, new Date())}`}
                className="absolute right-1 top-1 grid size-6 place-items-center rounded-full bg-graphite-950/70 text-white transition-colors duration-150 hover:bg-crit-600"
              >
                <Trash2 aria-hidden className="size-3" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {visor && (
        <CameraModal
          title={title}
          onClose={() => setVisor(false)}
          onShoot={(photo) => {
            guardar([photo]);
          }}
        />
      )}

      {viendo !== null && (
        <Modal open onClose={() => setViendo(null)} title={title} subtitle={photoWhen(viendo.takenAt, new Date())}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={viendo.dataUrl} alt={title} className="w-full rounded-control" />
          <p data-numeric className="text-xs text-fg-subtle">
            {viendo.width} × {viendo.height} · {formatBytes(viendo.bytes)} ·{' '}
            {viendo.source === 'camara' ? 'tomada con la cámara' : 'subida desde un archivo'}
          </p>
        </Modal>
      )}
    </div>
  );
}

/**
 * El visor de la webcam, para computadoras.
 *
 * Se monta al abrir y se desmonta al cerrar, y eso es lo que garantiza que la
 * cámara se apaga: `closeCamera` en la limpieza del efecto. Sin ella la luz
 * del portátil se queda encendida hasta recargar la página, que es la forma
 * más rápida de que alguien deje de confiar en la aplicación.
 */
function CameraModal({
  title,
  onClose,
  onShoot,
}: {
  readonly title: string;
  readonly onClose: () => void;
  readonly onShoot: (photo: EvidencePhoto) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let vivo = true;

    void (async () => {
      const r = await openCamera();
      if (isCaptureError(r)) {
        if (vivo) setError(r.message);
        return;
      }
      stream = r;
      if (!vivo) {
        closeCamera(stream);
        return;
      }
      if (videoRef.current !== null) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }
    })();

    return () => {
      vivo = false;
      closeCamera(stream);
    };
  }, []);

  const disparar = (): void => {
    const video = videoRef.current;
    if (video === null) return;
    const r = photoFromVideo(video);
    if (isCaptureError(r)) {
      setError(r.message);
      return;
    }
    onShoot(r);
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Tomar foto"
      subtitle={title}
      footer={
        <>
          <span className="hidden flex-1 sm:block" />
          <div className="flex flex-1 gap-3 sm:flex-none">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-11 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-control border border-border-strong px-4 text-sm font-semibold text-fg transition-colors duration-150 hover:bg-surface-sunken sm:flex-none sm:px-5"
            >
              <X aria-hidden className="size-4" />
              Cerrar
            </button>
            <button
              type="button"
              onClick={disparar}
              disabled={error !== null}
              className={cn(
                'inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-control text-sm font-semibold',
                'whitespace-nowrap px-4 sm:flex-none sm:px-5',
                error === null
                  ? 'bg-romero-500 text-white hover:bg-romero-600 active:scale-[0.98]'
                  : 'cursor-not-allowed bg-surface-sunken text-fg-subtle',
              )}
            >
              <Camera aria-hidden className="size-4" />
              Capturar
            </button>
          </div>
        </>
      }
    >
      {error === null ? (
        <video
          ref={videoRef}
          playsInline
          muted
          className="w-full rounded-control bg-graphite-950"
        />
      ) : (
        <p className="flex items-start gap-2 rounded-panel border border-warn-500/40 bg-warn-100 px-4 py-3 text-sm text-warn-700">
          <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </p>
      )}
    </Modal>
  );
}
