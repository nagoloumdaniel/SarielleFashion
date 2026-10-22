import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getI18n } from '@/i18n/server';
import { ButtonLink } from '@/components/ui/Button';

/* Pagination serveur (liens) : icônes seules sur mobile. */
export async function Pagination({
  page,
  totalPages,
  hrefFor,
  label,
}: {
  page: number;
  totalPages: number;
  hrefFor: (page: number) => string;
  label: string;
}) {
  if (totalPages <= 1) return null;
  const { t } = await getI18n();
  return (
    <nav aria-label={label} className="mt-4 flex items-center justify-between gap-2 text-sm">
      {page > 1 ? (
        <ButtonLink
          href={hrefFor(page - 1)}
          rel="prev"
          variant="secondary"
          size="sm"
          icon={ChevronLeft}
          iconOnly="mobile"
        >
          {t('common.ui.pagination.prev')}
        </ButtonLink>
      ) : (
        <span className="size-9 sm:w-28" aria-hidden="true" />
      )}
      <span className="text-muted">
        {t('common.ui.pagination.pageOf', { page, total: totalPages })}
      </span>
      {page < totalPages ? (
        <ButtonLink
          href={hrefFor(page + 1)}
          rel="next"
          variant="secondary"
          size="sm"
          icon={ChevronRight}
          iconOnly="mobile"
        >
          {t('common.ui.pagination.next')}
        </ButtonLink>
      ) : (
        <span className="size-9 sm:w-28" aria-hidden="true" />
      )}
    </nav>
  );
}
