'use client';

import { Check, Star, Trash2, X } from 'lucide-react';
import Link from 'next/link';
import { useState, useTransition } from 'react';
import { adminDeleteReview, adminModerateReview } from '@/modules/avis/actions';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useConfirm } from '@/components/ui/Confirm';
import { useToast } from '@/components/ui/Toast';

export type ReviewRow = {
  id: string;
  rating: number | null;
  comment: string | null;
  status: 'SUBMITTED' | 'APPROVED' | 'REJECTED' | string;
  /** ISO : transmis sérialisé depuis le serveur. */
  submittedAt: string | null;
  customer: { id: string; name: string; email: string };
  service: { name: string };
};

const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'medium',
  timeZone: 'Europe/Berlin',
});

function Stars({ rating }: { rating: number | null }) {
  const value = rating ?? 0;
  return (
    <span role="img" aria-label={`Note : ${value} sur 5`} className="inline-flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          aria-hidden="true"
          className={`size-4 ${n <= value ? 'fill-accent text-accent' : 'text-line'}`}
        />
      ))}
    </span>
  );
}

type Action = 'APPROVED' | 'REJECTED' | 'DELETE';

function ReviewCard({ review }: { review: ReviewRow }) {
  const confirm = useConfirm();
  const { notify } = useToast();
  const [pending, startTransition] = useTransition();
  const [active, setActive] = useState<Action | null>(null);

  function moderate(decision: 'APPROVED' | 'REJECTED') {
    setActive(decision);
    startTransition(async () => {
      try {
        const data = new FormData();
        data.set('id', review.id);
        data.set('decision', decision);
        const result = await adminModerateReview({}, data);
        if (result.error) notify(result.error, 'error');
        else notify(result.success ?? 'Avis mis à jour.', 'success');
      } catch {
        notify('Action impossible. Réessayez.', 'error');
      } finally {
        setActive(null);
      }
    });
  }

  async function remove() {
    const ok = await confirm({
      title: 'Supprimer cet avis ?',
      message: `L’avis de ${review.customer.name} sera supprimé définitivement, y compris s’il est publié sur le site.`,
      confirmLabel: 'Supprimer',
    });
    if (!ok) return;
    setActive('DELETE');
    startTransition(async () => {
      try {
        const result = await adminDeleteReview(review.id);
        if (result.error) notify(result.error, 'error');
        else notify(result.success ?? 'Avis supprimé.', 'success');
      } catch {
        notify('Action impossible. Réessayez.', 'error');
      } finally {
        setActive(null);
      }
    });
  }

  const statusBadge =
    review.status === 'APPROVED' ? (
      <Badge tone="success" size="sm">
        Publié
      </Badge>
    ) : review.status === 'REJECTED' ? (
      <Badge tone="alert" size="sm">
        Rejeté
      </Badge>
    ) : (
      <Badge tone="accent" size="sm">
        En attente
      </Badge>
    );

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Stars rating={review.rating} />
          {statusBadge}
        </div>
        {review.submittedAt ? (
          <time dateTime={review.submittedAt} className="text-xs text-muted">
            {dateFormatter.format(new Date(review.submittedAt))}
          </time>
        ) : null}
      </div>

      <p className="mt-2 text-sm">
        <Link
          href={`/dashboard/clients/${review.customer.id}`}
          className="font-semibold text-fg hover:text-cacao hover:underline"
        >
          {review.customer.name}
        </Link>
        <span className="text-muted"> · {review.service.name}</span>
      </p>
      <p className="truncate text-xs text-muted">{review.customer.email}</p>

      {review.comment ? (
        <blockquote className="mt-2 whitespace-pre-wrap wrap-break-word rounded-[var(--radius-md)] bg-page p-3 text-sm text-fg">
          {review.comment}
        </blockquote>
      ) : (
        <p className="mt-2 text-sm text-muted">Note seule, sans commentaire.</p>
      )}

      <div className="mt-3 flex items-center gap-2">
        {review.status !== 'APPROVED' ? (
          <Button
            type="button"
            size="sm"
            icon={Check}
            iconOnly="mobile"
            loading={pending && active === 'APPROVED'}
            disabled={pending}
            onClick={() => moderate('APPROVED')}
          >
            {review.status === 'REJECTED' ? 'Republier' : 'Approuver'}
          </Button>
        ) : null}
        {review.status !== 'REJECTED' ? (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            icon={X}
            iconOnly="mobile"
            loading={pending && active === 'REJECTED'}
            disabled={pending}
            onClick={() => moderate('REJECTED')}
          >
            {review.status === 'APPROVED' ? 'Retirer' : 'Rejeter'}
          </Button>
        ) : null}
        <Button
          type="button"
          size="sm"
          variant="danger"
          icon={Trash2}
          iconOnly="mobile"
          className="ml-auto"
          loading={pending && active === 'DELETE'}
          disabled={pending}
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
    <ul className="flex flex-col gap-2">
      {reviews.map((review) => (
        <li key={review.id}>
          <ReviewCard review={review} />
        </li>
      ))}
    </ul>
  );
}
