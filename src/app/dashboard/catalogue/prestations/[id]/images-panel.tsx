'use client';

import { ImageOff, Pencil, Save, Star, Trash2, Upload } from 'lucide-react';
import { useId, useRef, useState } from 'react';
import type { AdminServiceImage } from '@/lib/catalogue-admin';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useConfirm } from '@/components/ui/Confirm';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import {
  adminDeleteImage,
  adminReorderImages,
  adminSetPrimaryImage,
  adminUpdateImageAlt,
  adminUploadServiceImage,
} from '@/modules/catalogue/actions';
import {
  EmptyBlock,
  FormError,
  ReorderButtons,
  formDataOf,
  useFormAction,
  useReorderableList,
  useRunAction,
} from '../../catalogue-ui';

/* ============================================================
 * P4.4 / P4.5 - Photos d'une prestation : upload contrôlé,
 * ordre (la première est la principale), texte alternatif, suppression.
 * Les images sont servies par URL signée, jamais publiques.
 * ============================================================ */

type ImageWithUrl = AdminServiceImage & { url: string | null };

// Même limite que le serveur (image-validation) : on évite d'envoyer un fichier déjà refusé.
const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'];

function UploadForm({ serviceId, storageReady }: { serviceId: string; storageReady: boolean }) {
  const formRef = useRef<HTMLFormElement>(null);
  const fileId = useId();
  const [fileError, setFileError] = useState<string | undefined>();
  const { state, onSubmit, pending } = useFormAction(adminUploadServiceImage, () => {
    formRef.current?.reset();
    setFileError(undefined);
  });

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-line p-3 sm:p-4"
    >
      <input type="hidden" name="serviceId" value={serviceId} />
      <div className="flex flex-col gap-1.5">
        <label htmlFor={fileId} className="text-sm font-semibold">
          Photo{' '}
          <span aria-hidden="true" className="text-alert">
            *
          </span>
          <span className="sr-only">(obligatoire)</span>
        </label>
        <div className="relative">
          <Upload
            aria-hidden="true"
            className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-cacao"
          />
          <input
            id={fileId}
            name="file"
            type="file"
            accept={ACCEPTED.join(',')}
            required
            disabled={!storageReady}
            aria-invalid={fileError ? true : undefined}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return setFileError(undefined);
              if (!ACCEPTED.includes(file.type)) {
                event.target.value = '';
                return setFileError('Format non accepté : utilisez une photo JPEG, PNG ou WebP.');
              }
              if (file.size > MAX_BYTES) {
                event.target.value = '';
                return setFileError('La photo dépasse 5 Mo. Choisissez une image plus légère.');
              }
              setFileError(undefined);
            }}
            className="h-10 w-full rounded-[var(--radius-md)] border border-line bg-card pl-10 pr-3 text-sm leading-10 file:mr-3 file:rounded-full file:border-0 file:bg-accent-soft file:px-3 file:py-1 file:text-sm file:font-semibold file:text-fg disabled:opacity-60"
          />
        </div>
        <p className="text-sm text-muted">JPEG, PNG ou WebP, 5 Mo maximum.</p>
        <FormError message={fileError} />
      </div>
      <Input
        label="Texte alternatif"
        name="alt"
        maxLength={160}
        hint="Décrivez la coiffure visible sur la photo (accessibilité)."
        disabled={!storageReady}
      />
      <FormError message={state.error} />
      <Button
        type="submit"
        icon={Upload}
        loading={pending}
        disabled={!storageReady || pending}
        className="self-end"
      >
        Envoyer la photo
      </Button>
    </form>
  );
}

function AltForm({ image, onDone }: { image: ImageWithUrl; onDone: () => void }) {
  const { state, onSubmit, pending } = useFormAction(adminUpdateImageAlt, onDone);
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <input type="hidden" name="id" value={image.id} />
      <Input
        label="Texte alternatif"
        name="alt"
        maxLength={160}
        autoFocus
        defaultValue={image.alt}
        hint="160 caractères maximum."
      />
      <FormError message={state.error} />
      <Button type="submit" icon={Save} loading={pending} className="self-end">
        Enregistrer
      </Button>
    </form>
  );
}

function ImageRow({
  serviceId,
  image,
  index,
  count,
  pendingOrder,
  onMove,
}: {
  serviceId: string;
  image: ImageWithUrl;
  index: number;
  count: number;
  pendingOrder: boolean;
  onMove: (index: number, direction: -1 | 1) => void;
}) {
  const [altOpen, setAltOpen] = useState(false);
  const confirm = useConfirm();
  const primary = useRunAction();
  const remove = useRunAction();
  const isFirst = index === 0;
  const name = image.alt || `photo ${index + 1}`;

  async function onDelete() {
    const ok = await confirm({
      title: 'Supprimer cette photo ?',
      message: 'Le fichier sera aussi supprimé du stockage.',
    });
    if (!ok) return;
    remove.run(() => adminDeleteImage({}, formDataOf({ id: image.id })));
  }

  return (
    <li className="flex items-center gap-2 rounded-[var(--radius-md)] border border-line bg-card p-2 sm:gap-3 sm:p-3">
      <ReorderButtons
        index={index}
        count={count}
        pending={pendingOrder}
        onMove={(direction) => onMove(index, direction)}
        label={name}
      />
      {/* Vignette + texte : un clic ouvre la modification du texte alternatif. */}
      <button
        type="button"
        onClick={() => setAltOpen(true)}
        aria-label={`Modifier le texte alternatif de ${name}`}
        className="group flex min-w-0 flex-1 items-center gap-3 rounded-[var(--radius-sm)] p-1 text-left transition hover:bg-accent-soft/50"
      >
        <span className="relative size-16 shrink-0 overflow-hidden rounded-[var(--radius-sm)] bg-line sm:size-20">
          {image.url ? (
            // URL signée à durée limitée : next/image mettrait chaque URL en cache d'optimisation.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={image.url}
              alt=""
              loading="lazy"
              decoding="async"
              className="size-full object-cover"
            />
          ) : (
            <span className="flex size-full items-center justify-center text-muted">
              <ImageOff aria-hidden="true" className="size-5" />
            </span>
          )}
        </span>
        <span className="min-w-0 flex-1">
          {isFirst ? <Badge tone="accent">Principale</Badge> : null}
          <span className="mt-0.5 line-clamp-2 block text-sm text-muted">
            {image.alt || 'Aucun texte alternatif : ajoutez-en un pour l’accessibilité.'}
          </span>
        </span>
        <Pencil
          aria-hidden="true"
          className="size-4 shrink-0 text-muted transition group-hover:text-accent"
        />
      </button>
      <div className="flex shrink-0 flex-col gap-1 sm:flex-row sm:gap-2">
        {isFirst ? null : (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            iconOnly
            icon={Star}
            loading={primary.pending}
            onClick={() =>
              primary.run(() => adminSetPrimaryImage({}, formDataOf({ serviceId, id: image.id })))
            }
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
          loading={remove.pending}
          onClick={onDelete}
          aria-label={`Supprimer ${name}`}
          title="Supprimer"
        >
          Supprimer
        </Button>
      </div>
      <Modal open={altOpen} onClose={() => setAltOpen(false)} title="Texte alternatif de la photo">
        <AltForm image={image} onDone={() => setAltOpen(false)} />
      </Modal>
    </li>
  );
}

export function ImagesPanel({
  serviceId,
  images,
  storageReady,
  storageHint,
}: {
  serviceId: string;
  images: ImageWithUrl[];
  storageReady: boolean;
  storageHint: string;
}) {
  const { list, move, pending } = useReorderableList(images, (orderedIds) =>
    adminReorderImages(serviceId, orderedIds),
  );

  return (
    <div className="flex flex-col gap-3 rounded-[var(--radius-lg)] bg-card p-3 shadow-soft sm:p-4">
      {!storageReady ? <FormError message={storageHint} /> : null}

      <UploadForm serviceId={serviceId} storageReady={storageReady} />

      {list.length === 0 ? (
        <EmptyBlock>
          Aucune photo. La première photo envoyée devient la photo principale.
        </EmptyBlock>
      ) : (
        <>
          <p className="text-sm text-muted">La première photo est la photo principale.</p>
          <ul className="flex flex-col gap-2">
            {list.map((image, index) => (
              <ImageRow
                key={image.id}
                serviceId={serviceId}
                image={image}
                index={index}
                count={list.length}
                pendingOrder={pending}
                onMove={move}
              />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
