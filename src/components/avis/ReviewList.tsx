'use client';

import { BadgeCheck, ChevronDown } from 'lucide-react';
import Image from 'next/image';
import { useState, useTransition } from 'react';
import { useI18n } from '@/i18n/client';
import { INTL_LOCALE } from '@/i18n/config';
import { Stars } from '@/components/shared/Stars';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Lightbox } from '@/components/ui/Lightbox';
import { loadMoreReviewsAction } from '@/modules/avis/actions';
import type { PublicReview } from '@/modules/avis/queries';

function ReviewItem({ review }: { review: PublicReview }) {
  const { t, locale } = useI18n();
  const dateFormatter = new Intl.DateTimeFormat(INTL_LOCALE[locale], {
    dateStyle: 'long',
    timeZone: 'Europe/Berlin',
  });
  const [opened, setOpened] = useState<number | null>(null);
  return (
    <article className="rounded-[var(--radius-lg)] border border-line bg-card p-5 shadow-soft">
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <Stars value={review.rating} />
          <h3 className="font-heading text-base font-bold text-fg">{review.authorName}</h3>
          {review.verified ? (
            <Badge tone="success" size="sm">
              <BadgeCheck aria-hidden="true" className="mr-1 size-3.5" />
              {t('reviews.list.verified')}
            </Badge>
          ) : null}
        </div>
        <time dateTime={review.submittedAt} className="text-sm text-muted">
          {dateFormatter.format(new Date(review.submittedAt))}
        </time>
      </header>

      {review.comment ? (
        <p className="mt-3 max-w-prose whitespace-pre-line break-words leading-relaxed text-fg">
          {review.comment}
        </p>
      ) : null}

      {review.photos.length > 0 ? (
        <ul className="mt-4 flex flex-wrap gap-2" aria-label={t('reviews.list.photosLabel')}>
          {review.photos.map((photo, index) => (
            <li key={photo.src}>
              <button
                type="button"
                onClick={() => setOpened(index)}
                aria-label={t('reviews.list.enlarge', {
                  n: index + 1,
                  total: review.photos.length,
                })}
                className="relative block size-20 overflow-hidden rounded-[var(--radius-md)] bg-line sm:size-24"
              >
                <Image
                  src={photo.src}
                  alt={photo.alt}
                  fill
                  unoptimized
                  sizes="96px"
                  className="object-cover"
                />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <Lightbox
        images={review.photos}
        index={opened}
        onClose={() => setOpened(null)}
        onIndexChange={setOpened}
      />
    </article>
  );
}

/* Liste des avis d'une prestation : premiers avis rendus côté serveur, suite à la demande. */
export function ReviewList({
  serviceId,
  initial,
  initialHasMore,
}: {
  serviceId: string;
  initial: PublicReview[];
  initialHasMore: boolean;
}) {
  const { t } = useI18n();
  const [items, setItems] = useState(initial);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();

  function loadMore() {
    setFailed(false);
    startTransition(async () => {
      try {
        const next = await loadMoreReviewsAction(serviceId, items.length);
        setItems((current) => [
          ...current,
          ...next.items.filter((item) => !current.some((known) => known.id === item.id)),
        ]);
        setHasMore(next.hasMore);
      } catch {
        setFailed(true);
      }
    });
  }

  return (
    <div className="space-y-4">
      <ul aria-label={t('reviews.list.label')} className="space-y-4">
        {items.map((review) => (
          <li key={review.id}>
            <ReviewItem review={review} />
          </li>
        ))}
      </ul>
      {failed ? (
        <p role="alert" className="text-sm font-medium text-alert">
          {t('reviews.list.loadError')}
        </p>
      ) : null}
      {hasMore ? (
        <Button
          type="button"
          variant="secondary"
          icon={ChevronDown}
          loading={pending}
          onClick={loadMore}
        >
          {t('reviews.list.more')}
        </Button>
      ) : null}
    </div>
  );
}
