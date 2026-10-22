import type { Metadata } from 'next';
import { getReviewByToken } from '@/modules/avis/queries';
import { isReviewTokenValid } from '@/modules/avis/engine';
import { ReviewForm } from '@/components/avis/ReviewForm';
import { isStorageConfigured } from '@/modules/fichiers/storage';
import { Title } from '@/components/ui/Title';
import { I18nScope } from '@/i18n/client';
import { getI18n } from '@/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return {
    title: t('reviews.tokenPage.metaTitle'),
    robots: { index: false, follow: false },
  };
}

export default async function AvisTokenPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { t, messages } = await getI18n();
  const review = await getReviewByToken(token);

  if (!review) {
    return (
      <main className="page-main">
        <div className="rounded-[var(--radius-lg)] border border-alert bg-alert-soft p-8 text-center">
          <Title as="h1" size="display" className="">
            {t('reviews.tokenPage.invalidTitle')}
          </Title>
          <p className="mt-3 text-fg">{t('reviews.tokenPage.invalidText')}</p>
        </div>
      </main>
    );
  }

  const tokenValid = isReviewTokenValid(review.tokenExpiresAt, new Date());
  const answered = review.submittedAt !== null;
  if (!tokenValid || answered) {
    return (
      <main className="page-main">
        <div className="rounded-[var(--radius-lg)] border border-line bg-card p-8 text-center">
          <Title as="h1" size="display" className="">
            {answered ? t('reviews.tokenPage.answeredTitle') : t('reviews.tokenPage.expiredTitle')}
          </Title>
          <p className="mt-3 text-muted">
            {answered ? t('reviews.tokenPage.answeredText') : t('reviews.tokenPage.expiredText')}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="page-main">
      <div className="rounded-[var(--radius-lg)] border border-line bg-card p-8 shadow-soft">
        <Title as="h1" size="display" className="">
          {t('reviews.tokenPage.title', { service: review.service.name })}
        </Title>
        <div className="mt-6">
          <I18nScope messages={{ reviews: messages.reviews }}>
            <ReviewForm mode="token" token={token} photosEnabled={isStorageConfigured()} />
          </I18nScope>
        </div>
      </div>
    </main>
  );
}
