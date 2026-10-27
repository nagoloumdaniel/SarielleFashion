'use client';

import { ImageOff, ImagePlus, Star, Trash2 } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  MAX_SERVICE_PHOTOS,
  SERVICE_PHOTO_ACCEPTED_MIME,
  SERVICE_PHOTO_MAX_BYTES,
} from '@/modules/catalogue/service-photos';

/* ============================================================
 * Champ « photos » d'un formulaire (prestation) : miniatures, ajout,
 * suppression, choix de la photo principale (la première).
 *
 * Le composant reste dans le <form> et ne fait aucun appel réseau : à l'envoi du formulaire il
 * fournit `photos` (nouveaux fichiers, dans l'ordre) et `photoLayout` (ordre final, voir
 * modules/catalogue/service-photos.ts). Le serveur re-valide tout (limite, type, signature).
 * ============================================================ */

export interface ExistingPhoto {
  id: string;
  url: string | null;
  alt: string;
}

type Item = {
  uid: string;
  existingId?: string;
  file?: File;
  preview: string | null;
  alt: string;
};

let counter = 0;
const nextUid = () => `photo-${(counter += 1)}`;

export function PhotoSlotsField({
  initial,
  disabled = false,
  pending = false,
  storageReady = true,
  storageHint,
  max = MAX_SERVICE_PHOTOS,
}: {
  initial: ExistingPhoto[];
  /** Bloque toute modification. */
  disabled?: boolean;
  /** Enregistrement en cours : les nouvelles photos affichent un indicateur d'envoi. */
  pending?: boolean;
  storageReady?: boolean;
  storageHint?: string;
  max?: number;
}) {
  const pickerId = useId();
  const errorId = useId();
  const pickerRef = useRef<HTMLInputElement>(null);
  const syncRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | undefined>();
  const [items, setItems] = useState<Item[]>(() =>
    initial.slice(0, max).map((photo) => ({
      uid: nextUid(),
      existingId: photo.id,
      preview: photo.url,
      alt: photo.alt,
    })),
  );

  // Les nouveaux fichiers voyagent via un <input type="file" name="photos"> synchronisé avec l'état.
  useEffect(() => {
    const input = syncRef.current;
    if (!input) return;
    const transfer = new DataTransfer();
    for (const item of items) if (item.file) transfer.items.add(item.file);
    input.files = transfer.files;
  }, [items]);

  // Libère les aperçus (blob:) restants au démontage.
  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  });
  useEffect(
    () => () => {
      for (const item of itemsRef.current) {
        if (item.file && item.preview) URL.revokeObjectURL(item.preview);
      }
    },
    [],
  );

  let fileCursor = 0;
  const layout = JSON.stringify(
    items.map((item) => (item.existingId ? `e:${item.existingId}` : `n:${fileCursor++}`)),
  );
  const full = items.length >= max;
  const locked = disabled || pending;

  function onPick(files: FileList | null) {
    if (!files || files.length === 0) return;
    const next: Item[] = [];
    let message: string | undefined;
    for (const file of Array.from(files)) {
      if (items.length + next.length >= max) {
        message = `${max} photos maximum par prestation.`;
        break;
      }
      if (!(SERVICE_PHOTO_ACCEPTED_MIME as readonly string[]).includes(file.type)) {
        message = `« ${file.name} » : format non accepté, utilise une photo JPEG, PNG ou WebP.`;
        continue;
      }
      if (file.size > SERVICE_PHOTO_MAX_BYTES) {
        message = `« ${file.name} » dépasse 5 Mo. Choisis une image plus légère.`;
        continue;
      }
      next.push({ uid: nextUid(), file, preview: URL.createObjectURL(file), alt: '' });
    }
    setError(message);
    if (next.length > 0) setItems((current) => [...current, ...next]);
    if (pickerRef.current) pickerRef.current.value = '';
  }

  function remove(uid: string) {
    setError(undefined);
    setItems((current) => {
      const target = current.find((item) => item.uid === uid);
      if (target?.file && target.preview) URL.revokeObjectURL(target.preview);
      return current.filter((item) => item.uid !== uid);
    });
  }

  function makePrimary(uid: string) {
    setItems((current) => {
      const target = current.find((item) => item.uid === uid);
      return target ? [target, ...current.filter((item) => item.uid !== uid)] : current;
    });
  }

  return (
    <fieldset className="flex min-w-0 flex-col gap-2 border-0 p-0" aria-describedby={errorId}>
      <legend className="mb-1.5 text-sm font-semibold text-fg">Photos de la prestation</legend>

      <input type="hidden" name="photoLayout" value={layout} />
      <input ref={syncRef} type="file" name="photos" multiple hidden tabIndex={-1} aria-hidden />

      <ul className="grid grid-cols-3 gap-2 sm:gap-3" aria-label="Photos de la prestation">
        {items.map((item, index) => {
          const name = item.alt || `photo ${index + 1}`;
          return (
            <li
              key={item.uid}
              className="relative aspect-[4/5] overflow-hidden rounded-[var(--radius-md)] border border-line bg-line"
            >
              {item.preview ? (
                // Aperçu local (blob:) ou URL signée à durée limitée : next/image n'apporte rien ici.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.preview}
                  alt={item.alt}
                  className="size-full object-cover"
                  decoding="async"
                />
              ) : (
                <span className="flex size-full items-center justify-center text-muted">
                  <ImageOff aria-hidden="true" className="size-6" />
                </span>
              )}

              {index === 0 ? (
                <Badge tone="accent" size="sm" className="absolute bottom-1.5 left-1.5 shadow-soft">
                  Principale
                </Badge>
              ) : null}

              {pending && item.file ? (
                <span
                  role="status"
                  className="absolute inset-0 flex items-center justify-center bg-card/70 backdrop-blur-[2px]"
                >
                  <span
                    aria-hidden="true"
                    className="inline-block size-6 animate-spin rounded-full border-2 border-accent border-t-transparent motion-reduce:animate-none"
                  />
                  <span className="sr-only">Envoi de {name}</span>
                </span>
              ) : null}

              <div className="absolute inset-x-1 top-1 flex justify-between gap-1">
                {index === 0 ? (
                  <span />
                ) : (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    iconOnly
                    icon={Star}
                    disabled={locked}
                    onClick={() => makePrimary(item.uid)}
                    aria-label={`Définir ${name} comme photo principale`}
                    title="Définir comme principale"
                  >
                    Définir comme principale
                  </Button>
                )}
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  iconOnly
                  icon={Trash2}
                  disabled={locked}
                  onClick={() => remove(item.uid)}
                  aria-label={`Retirer ${name}`}
                  title="Retirer"
                >
                  Retirer
                </Button>
              </div>
            </li>
          );
        })}

        {full ? null : (
          <li className="aspect-[4/5]">
            <label
              htmlFor={pickerId}
              className={`flex size-full flex-col items-center justify-center gap-1.5 rounded-[var(--radius-md)] border border-dashed border-line bg-card px-2 text-center text-sm font-semibold text-fg transition focus-within:ring-2 focus-within:ring-accent ${
                locked || !storageReady
                  ? 'cursor-not-allowed opacity-60'
                  : 'cursor-pointer hover:border-cacao hover:bg-accent-soft/50'
              }`}
            >
              <ImagePlus aria-hidden="true" className="size-6 text-accent" />
              Ajouter
              <input
                ref={pickerRef}
                id={pickerId}
                type="file"
                multiple
                accept={SERVICE_PHOTO_ACCEPTED_MIME.join(',')}
                disabled={locked || !storageReady}
                onChange={(event) => onPick(event.target.files)}
                className="sr-only"
              />
            </label>
          </li>
        )}
      </ul>

      <p className="text-sm text-muted">
        {items.length}/{max} photos · JPEG, PNG ou WebP, 5 Mo maximum. La première est la photo
        principale ; les changements sont appliqués à l’enregistrement.
      </p>
      {!storageReady && storageHint ? (
        <p className="text-sm font-medium text-alert">{storageHint}</p>
      ) : null}
      <p id={errorId} role="alert" className={error ? 'text-sm font-medium text-alert' : 'sr-only'}>
        {error}
      </p>
    </fieldset>
  );
}
