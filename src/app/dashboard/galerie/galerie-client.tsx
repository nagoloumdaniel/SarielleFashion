'use client';

import {
  Eye,
  EyeOff,
  ImagePlus,
  Images,
  ImageOff,
  MoveLeft,
  MoveRight,
  Plus,
  Scissors,
  Trash2,
  Type,
  Upload,
} from 'lucide-react';
import Image from 'next/image';
import {
  startTransition as startFormTransition,
  useActionState,
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
  type FormEvent,
} from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useConfirm } from '@/components/ui/Confirm';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { useToast } from '@/components/ui/Toast';
import {
  adminDeleteGalleryPhoto,
  adminMoveGalleryPhoto,
  adminUpdateGalleryPhoto,
  adminUploadGalleryPhoto,
  type GalleryActionState,
} from '@/modules/galerie/actions';

type GalleryRow = {
  id: string;
  url: string | null;
  alt: string;
  published: boolean;
  serviceId: string;
  serviceName: string | null;
};
type ServiceOption = { id: string; name: string };

const MAX_FILES = 4;

const serviceOptions = (services: ServiceOption[]) => [
  { value: '', label: 'Aucune' },
  ...services.map((service) => ({ value: service.id, label: service.name })),
];

function Thumb({ url, alt }: { url: string | null; alt: string }) {
  return url ? (
    // URL signée à durée limitée : next/image sans optimisation (pas de domaine à déclarer).
    <Image
      src={url}
      alt={alt}
      fill
      unoptimized
      sizes="(min-width: 1024px) 25vw, 50vw"
      className="object-cover"
    />
  ) : (
    <span className="flex size-full items-center justify-center text-muted">
      <ImageOff aria-hidden="true" className="size-8" />
      <span className="sr-only">Image indisponible</span>
    </span>
  );
}

/* ---------- Ajout (Modal) ---------- */

function UploadForm({ services, onDone }: { services: ServiceOption[]; onDone: () => void }) {
  const { notify } = useToast();
  const [state, formAction, pending] = useActionState<GalleryActionState, FormData>(
    adminUploadGalleryPhoto,
    {},
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = useState<{ name: string; url: string }[]>([]);

  useEffect(() => {
    if (state.success) {
      notify(state.success, 'success');
      onDone();
    }
  }, [state, notify, onDone]);

  // Aperçus locaux : URLs d'objet révoquées au changement / démontage.
  useEffect(() => {
    return () => previews.forEach((preview) => URL.revokeObjectURL(preview.url));
  }, [previews]);

  function onPick(files: FileList | null) {
    const list = Array.from(files ?? []).slice(0, MAX_FILES);
    setPreviews(list.map((file) => ({ name: file.name, url: URL.createObjectURL(file) })));
  }

  /* `onSubmit` plutôt que `<form action>` : React 19 vide sinon le champ fichier et les champs
     non contrôlés après l'action, alors que les aperçus restent affichés (renvoi sans fichier).
     On n'envoie que les fichiers prévisualisés (MAX_FILES) pour rester cohérent avec l'aperçu. */
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const files = formData.getAll('file').filter((value): value is File => value instanceof File);
    formData.delete('file');
    for (const file of files.slice(0, MAX_FILES)) formData.append('file', file);
    startFormTransition(() => formAction(formData));
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <div>
        <input
          ref={inputRef}
          id="gallery-file"
          type="file"
          name="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          tabIndex={-1}
          className="sr-only"
          onChange={(event) => onPick(event.target.files)}
        />
        <Button
          type="button"
          variant="secondary"
          icon={Upload}
          className="w-full"
          onClick={() => inputRef.current?.click()}
        >
          {previews.length > 0 ? 'Changer les photos' : 'Choisir des photos'}
        </Button>
        <p className="mt-1.5 text-sm text-muted">
          JPEG, PNG ou WebP, 5 Mo maximum chacune ({MAX_FILES} photos à la fois).
        </p>
        {previews.length > 0 ? (
          <ul className="mt-2 grid grid-cols-4 gap-2">
            {previews.map((preview) => (
              <li
                key={preview.url}
                className="relative aspect-square overflow-hidden rounded-[var(--radius-md)] bg-line"
              >
                <Image
                  src={preview.url}
                  alt={preview.name}
                  fill
                  unoptimized
                  sizes="25vw"
                  className="object-cover"
                />
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <Select
        label="Prestation associée (facultatif)"
        name="serviceId"
        icon={Scissors}
        options={serviceOptions(services)}
      />
      <Input label="Légende (facultatif)" name="alt" icon={Type} maxLength={200} />
      {state.error ? (
        <p role="alert" className="text-sm font-medium text-alert">
          {state.error}
        </p>
      ) : null}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onDone}>
          Annuler
        </Button>
        <Button type="submit" icon={ImagePlus} loading={pending} disabled={previews.length === 0}>
          Ajouter
        </Button>
      </div>
    </form>
  );
}

/* ---------- Édition (Modal) ---------- */

function EditForm({
  photo,
  services,
  onDone,
}: {
  photo: GalleryRow;
  services: ServiceOption[];
  onDone: () => void;
}) {
  const { notify } = useToast();
  const [state, formAction, pending] = useActionState<GalleryActionState, FormData>(
    adminUpdateGalleryPhoto,
    {},
  );
  const [published, setPublished] = useState(photo.published);

  useEffect(() => {
    if (state.success) {
      notify(state.success, 'success');
      onDone();
    }
  }, [state, notify, onDone]);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startFormTransition(() => formAction(formData));
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <input type="hidden" name="id" value={photo.id} />
      <div className="relative aspect-[4/3] overflow-hidden rounded-[var(--radius-md)] bg-line">
        <Thumb url={photo.url} alt={photo.alt || 'Photo de la galerie'} />
      </div>
      <Input
        label="Légende (facultatif)"
        name="alt"
        icon={Type}
        maxLength={200}
        defaultValue={photo.alt}
      />
      <Select
        label="Prestation associée"
        name="serviceId"
        icon={Scissors}
        defaultValue={photo.serviceId}
        options={serviceOptions(services)}
      />
      <label className="flex items-start gap-2.5 text-sm font-semibold text-fg">
        <input
          type="checkbox"
          name="published"
          value="true"
          checked={published}
          onChange={(event) => setPublished(event.target.checked)}
          className="mt-0.5 size-4 shrink-0 accent-accent"
        />
        Afficher cette photo sur le site
      </label>
      {state.error ? (
        <p role="alert" className="text-sm font-medium text-alert">
          {state.error}
        </p>
      ) : null}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onDone}>
          Annuler
        </Button>
        <Button type="submit" loading={pending}>
          Enregistrer
        </Button>
      </div>
    </form>
  );
}

/* ---------- Galerie ---------- */

export function GalerieClient({
  photos,
  offset = 0,
  total = photos.length,
  services,
  storageReady,
}: {
  photos: GalleryRow[];
  /** Rang global de la première photo de la page (pagination). */
  offset?: number;
  total?: number;
  services: ServiceOption[];
  storageReady: boolean;
}) {
  const { notify } = useToast();
  const confirm = useConfirm();
  const [modal, setModal] = useState<'new' | GalleryRow | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const close = useCallback(() => setModal(null), []);

  function open(next: 'new' | GalleryRow) {
    setFormKey((k) => k + 1);
    setModal(next);
  }

  function run(
    id: string,
    action: (prev: GalleryActionState, formData: FormData) => Promise<GalleryActionState>,
    fields: Record<string, string>,
  ) {
    setBusy(id);
    startTransition(async () => {
      const formData = new FormData();
      formData.set('id', id);
      for (const [key, value] of Object.entries(fields)) formData.set(key, value);
      try {
        const result = await action({}, formData);
        if (result.error) notify(result.error, 'error');
        else if (result.success) notify(result.success, 'success');
      } catch {
        notify('Action impossible. Réessayez.', 'error');
      } finally {
        setBusy(null);
      }
    });
  }

  function togglePublish(photo: GalleryRow) {
    run(photo.id, adminUpdateGalleryPhoto, {
      serviceId: photo.serviceId,
      alt: photo.alt,
      published: String(!photo.published),
    });
  }

  async function remove(photo: GalleryRow) {
    const ok = await confirm({
      title: 'Supprimer la photo',
      message: 'Cette photo sera supprimée définitivement de la galerie et du stockage.',
      confirmLabel: 'Supprimer',
    });
    if (ok) run(photo.id, adminDeleteGalleryPhoto, {});
  }

  return (
    <>
      <PageHeader
        icon={Images}
        title="Galerie"
        actions={
          <Button
            icon={Plus}
            iconOnly="mobile"
            onClick={() => open('new')}
            disabled={!storageReady}
          >
            Ajouter des photos
          </Button>
        }
      />

      {!storageReady ? (
        <p
          role="alert"
          className="mb-3 rounded-[var(--radius-md)] border border-alert bg-alert-soft p-3 text-sm text-alert"
        >
          Le stockage des photos n’est pas configuré : l’ajout est désactivé. Renseignez les
          variables S3 dans l’environnement du serveur.
        </p>
      ) : null}

      {photos.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-[var(--radius-lg)] bg-card px-4 py-10 text-center shadow-soft">
          <span
            aria-hidden="true"
            className="inline-flex size-12 items-center justify-center rounded-full bg-accent-soft text-accent"
          >
            <Images className="size-6" />
          </span>
          <p className="font-heading text-lg font-bold text-fg">Aucune photo</p>
          <p className="max-w-sm text-sm text-muted">
            Ajoute tes réalisations : elles apparaissent tout de suite sur la page Galerie et sur
            l’accueil.
          </p>
          <Button icon={Plus} onClick={() => open('new')} disabled={!storageReady}>
            Ajouter des photos
          </Button>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
          {photos.map((photo, index) => {
            const loading = busy === photo.id;
            return (
              <li
                key={photo.id}
                className="relative overflow-hidden rounded-[var(--radius-lg)] border border-transparent bg-card shadow-soft transition focus-within:border-cacao hover:border-cacao"
              >
                {/* Carte entière cliquable → édition ; les actions secondaires restent au-dessus. */}
                <button
                  type="button"
                  onClick={() => open(photo)}
                  aria-label={`Modifier la photo ${photo.alt || photo.serviceName || ''}`.trim()}
                  className="block w-full text-left outline-none after:absolute after:inset-0 after:content-['']"
                >
                  <span className="relative block aspect-square bg-line">
                    <Thumb url={photo.url} alt={photo.alt || photo.serviceName || 'Réalisation'} />
                    <Badge
                      tone={photo.published ? 'success' : 'neutral'}
                      size="sm"
                      className="absolute left-2 top-2"
                    >
                      {photo.published ? 'Visible' : 'Masquée'}
                    </Badge>
                  </span>
                  <span className="block px-2.5 pt-2">
                    <span className="block truncate text-sm font-semibold text-fg">
                      {photo.alt || photo.serviceName || 'Sans légende'}
                    </span>
                    <span className="block truncate text-xs text-muted">
                      {photo.serviceName ?? 'Sans prestation'}
                    </span>
                  </span>
                </button>
                <div className="relative z-10 flex items-center gap-1.5 p-2.5">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    iconOnly
                    icon={MoveLeft}
                    disabled={offset + index === 0 || loading}
                    onClick={() => run(photo.id, adminMoveGalleryPhoto, { direction: 'up' })}
                  >
                    Déplacer avant
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    iconOnly
                    icon={MoveRight}
                    disabled={offset + index === total - 1 || loading}
                    onClick={() => run(photo.id, adminMoveGalleryPhoto, { direction: 'down' })}
                  >
                    Déplacer après
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    iconOnly
                    icon={photo.published ? EyeOff : Eye}
                    loading={loading}
                    onClick={() => togglePublish(photo)}
                    className="ml-auto"
                  >
                    {photo.published ? 'Masquer' : 'Afficher'}
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    iconOnly
                    icon={Trash2}
                    disabled={loading}
                    onClick={() => void remove(photo)}
                  >
                    Supprimer
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Modal
        open={modal !== null}
        onClose={close}
        title={modal === 'new' ? 'Ajouter des photos' : 'Modifier la photo'}
      >
        {modal === 'new' ? (
          <UploadForm key={formKey} services={services} onDone={close} />
        ) : modal ? (
          <EditForm key={formKey} photo={modal} services={services} onDone={close} />
        ) : null}
      </Modal>
    </>
  );
}
