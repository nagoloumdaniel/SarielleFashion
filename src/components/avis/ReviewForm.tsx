'use client';

import { CheckCircle2, ImagePlus, Send, X } from 'lucide-react';
import Image from 'next/image';
import {
  startTransition,
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { StarRatingInput } from '@/components/ui/StarRatingInput';
import { Textarea } from '@/components/ui/Textarea';
import { MAX_REVIEW_COMMENT_LENGTH, MAX_REVIEW_PHOTOS } from '@/modules/avis/engine';
import {
  submitPublicReviewAction,
  submitReviewAction,
  type ReviewActionState,
} from '@/modules/avis/actions';

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'];

type Props =
  | { mode: 'public'; serviceId: string; serviceName: string; photosEnabled: boolean }
  | { mode: 'token'; token: string; photosEnabled: boolean };

/* Formulaire d'avis unique : fiche prestation (mode public, nom demandé) ou lien e-mail
   (mode token, client vérifié). Étoiles + commentaire facultatif + jusqu'à 3 photos.
   Piège à robots (champ « website ») et états chargement / erreur / succès. */
export function ReviewForm(props: Props) {
  const action = props.mode === 'token' ? submitReviewAction : submitPublicReviewAction;
  const [state, formAction, pending] = useActionState<ReviewActionState, FormData>(action, {});
  const [files, setFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const successRef = useRef<HTMLDivElement>(null);

  const previews = useMemo(
    () => files.map((file) => ({ name: file.name, url: URL.createObjectURL(file) })),
    [files],
  );
  useEffect(
    () => () => previews.forEach((preview) => URL.revokeObjectURL(preview.url)),
    [previews],
  );
  useEffect(() => {
    if (state.success) successRef.current?.focus();
  }, [state.success]);

  function onPick(list: FileList | null) {
    const incoming = Array.from(list ?? []);
    if (inputRef.current) inputRef.current.value = '';
    const next = [...files];
    let problem: string | null = null;
    for (const file of incoming) {
      if (next.length >= MAX_REVIEW_PHOTOS) {
        problem = `${MAX_REVIEW_PHOTOS} photos maximum.`;
        break;
      }
      if (!ACCEPTED.includes(file.type)) {
        problem = 'Utilise des photos JPEG, PNG ou WebP.';
        continue;
      }
      if (file.size > MAX_BYTES) {
        problem = 'Chaque photo doit peser 5 Mo au maximum.';
        continue;
      }
      next.push(file);
    }
    setFileError(problem);
    setFiles(next);
  }

  /* `onSubmit` plutôt que `<form action>` : React 19 vide sinon les champs après l'action,
     alors qu'une erreur doit laisser la saisie intacte. Les photos viennent de l'état. */
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.delete('photos');
    for (const file of files) formData.append('photos', file);
    startTransition(() => formAction(formData));
  }

  if (state.success) {
    return (
      <div
        ref={successRef}
        tabIndex={-1}
        role="status"
        className="flex items-start gap-3 rounded-[var(--radius-md)] border border-success bg-success-soft p-5 text-success outline-none"
      >
        <CheckCircle2 aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
        <p className="font-medium">{state.success}</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate={false}>
      {props.mode === 'token' ? (
        <input type="hidden" name="token" value={props.token} />
      ) : (
        <>
          <input type="hidden" name="serviceId" value={props.serviceId} />
          <Input
            label="Ton prénom"
            name="authorName"
            required
            minLength={2}
            maxLength={60}
            autoComplete="given-name"
            hint="Seuls ton prénom et l’initiale de ton nom sont affichés."
          />
        </>
      )}

      <StarRatingInput />

      <div>
        <Textarea
          label="Ton commentaire (facultatif)"
          name="comment"
          maxLength={MAX_REVIEW_COMMENT_LENGTH}
          rows={4}
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          placeholder="Raconte comment s’est passé ton rendez-vous"
        />
        <p className="mt-1 text-right text-xs text-muted" aria-hidden="true">
          {comment.length} / {MAX_REVIEW_COMMENT_LENGTH}
        </p>
      </div>

      {props.photosEnabled ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold text-fg">
            Photos (facultatif, {MAX_REVIEW_PHOTOS} maximum)
          </p>
          <input
            ref={inputRef}
            type="file"
            name="photos"
            accept={ACCEPTED.join(',')}
            multiple
            tabIndex={-1}
            className="sr-only"
            aria-label="Choisir des photos"
            onChange={(event) => onPick(event.target.files)}
          />
          <div>
            <Button
              type="button"
              variant="secondary"
              icon={ImagePlus}
              disabled={files.length >= MAX_REVIEW_PHOTOS}
              onClick={() => inputRef.current?.click()}
            >
              Ajouter des photos
            </Button>
          </div>
          <p className="text-sm text-muted">JPEG, PNG ou WebP, 5 Mo maximum chacune.</p>
          {fileError ? (
            <p role="alert" className="text-sm font-medium text-alert">
              {fileError}
            </p>
          ) : null}
          {previews.length > 0 ? (
            <ul className="grid grid-cols-3 gap-2">
              {previews.map((preview, index) => (
                <li
                  key={preview.url}
                  className="relative aspect-square overflow-hidden rounded-[var(--radius-md)] bg-line"
                >
                  <Image
                    src={preview.url}
                    alt={`Aperçu de la photo ${index + 1}`}
                    fill
                    unoptimized
                    sizes="120px"
                    className="object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setFiles(files.filter((_, i) => i !== index))}
                    aria-label={`Retirer la photo ${index + 1}`}
                    className="absolute right-1 top-1 inline-flex size-8 items-center justify-center rounded-full bg-black/60 text-white transition hover:bg-black/80"
                  >
                    <X aria-hidden="true" className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {/* Piège à robots : invisible et hors parcours clavier, doit rester vide. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Ne pas remplir
          <input type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
        </label>
      </div>

      {state.error ? (
        <p
          role="alert"
          className="rounded-[var(--radius-md)] border border-alert bg-alert-soft p-3 text-sm font-medium text-alert"
        >
          {state.error}
        </p>
      ) : null}

      <div>
        <Button type="submit" icon={Send} loading={pending}>
          Publier mon avis
        </Button>
      </div>
    </form>
  );
}
