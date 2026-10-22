'use client';

import { BadgeCheck, ExternalLink, Trash2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useState, useTransition } from 'react';
import { adminDeleteReview } from '@/modules/avis/actions';
import { Stars } from '@/components/shared/Stars';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useConfirm } from '@/components/ui/Confirm';
import { Lightbox } from '@/components/ui/Lightbox';
import { useToast } from '@/components/ui/Toast';

export type ReviewRow = {
  id: string;
  rating: number;
  comment: string | null;
  authorName: string;
  verified: boolean;
  /** ISO : transmis sérialisé depuis le serveur. */
  submittedAt: string;
  customer: { id: string; name: string; email: string } | null;
  service: { name: string; slug: string };
  /** URLs signées des photos jointes. */
  photos: string[];
};

const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Europe/Berlin',
});

function ReviewCard({ review }: { review: ReviewRow }) {
  const confirm = useConfirm();
  const { notify } = useToast();
  const [pending, startTransition] = useTransition();
  const [opened, setOpened] = useState<number | null>(null);

  async function remove() {
    const ok = await confirm({
      title: 'Supprimer cet avis ?',
      message: `L’avis de ${review.authorName} sera supprimé définitivement du site, photos comprises.`,
      confirmLabel: 'Supprimer',
    });
    if (!ok) return;
    startTransition(async () => {
      try {
        const result = await adminDeleteReview(review.id);
        if (result.error) notify(result.error, 'error');
        else notify(result.success ?? 'Avis supprimé.', 'success');
      } catch {
        notify('Action impossible. Réessaie.', 'error');
      }
    });
  }

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Stars value={review.rating} />
          <span className="text-sm font-semibold text-fg">{review.rating} / 5</span>
          {review.verified ? (
            <Badge tone="success" size="sm">
              <BadgeCheck aria-hidden="true" className="mr-1 size-3.5" />
              Client vérifié
            </Badge>
          ) : (
            <Badge tone="neutral" size="sm">
              Avis libre
            </Badge>
          )}
        </div>
        <time dateTime={review.submittedAt} className="text-xs text-muted">
          {dateFormatter.format(new Date(review.submittedAt))}
        </time>
      </div>

      <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
        <div className="flex gap-2">
          <dt className="text-muted">Client</dt>
          <dd className="min-w-0 font-semibold text-fg">
            {review.customer ? (
              <Link
                href={`/dashboard/clients/${review.customer.id}`}
                className="hover:text-cacao hover:underline"
              >
                {review.customer.name}
              </Link>
            ) : (
              review.authorName
            )}
            {review.customer ? (
              <span className="block truncate text-xs font-normal text-muted">
                {review.customer.email}
              </span>
            ) : null}
          </dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-muted">Prestation</dt>
          <dd className="min-w-0 font-semibold text-fg">
            <Link
              href={`/coiffures/${review.service.slug}#avis`}
              className="inline-flex items-center gap-1 hover:text-cacao hover:underline"
            >
              {review.service.name}
              <ExternalLink aria-hidden="true" className="size-3.5" />
            </Link>
          </dd>
        </div>
      </dl>

      {review.comment ? (
        <blockquote className="mt-3 whitespace-pre-wrap break-words rounded-[var(--radius-md)] bg-page p-3 text-sm text-fg">
          {review.comment}
        </blockquote>
      ) : (
        <p className="mt-3 text-sm text-muted">Note seule, sans commentaire.</p>
      )}

      {review.photos.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-2" aria-label="Photos de l’avis">
          {review.photos.map((url, index) => (
            <li key={url}>
              <button
                type="button"
                onClick={() => setOpened(index)}
                aria-label={`Agrandir la photo ${index + 1} sur ${review.photos.length}`}
                className="relative block size-20 overflow-hidden rounded-[var(--radius-md)] bg-line"
              >
                <Image
                  src={url}
                  alt={`Photo ${index + 1} de l’avis de ${review.authorName}`}
                  fill
                  unoptimized
                  sizes="80px"
                  className="object-cover"
                />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <Lightbox
        images={review.photos.map((url, index) => ({
          src: url,
          alt: `Photo ${index + 1} de l’avis de ${review.authorName}`,
        }))}
        index={opened}
        onClose={() => setOpened(null)}
        onIndexChange={setOpened}
      />

      <div className="mt-3 flex justify-end">
        <Button
          type="button"
          size="sm"
          variant="danger"
          icon={Trash2}
          iconOnly="mobile"
          loading={pending}
          onClick={remove}
        >
          Supprimer
        </Button>
      </div>
    </Card>
  );
}

export function AvisClient({ reviews }: { reviews: ReviewRow[] }) {
  return (
    <ul className="flex flex-col gap-2" aria-label="Avis publiés">
      {reviews.map((review) => (
        <li key={review.id}>
          <ReviewCard review={review} />
        </li>
      ))}
    </ul>
  );
}
