import type { Metadata } from 'next';
import { getReviewByToken } from '@/modules/avis/queries';
import { isReviewTokenValid } from '@/modules/avis/engine';
import { ReviewForm } from '@/components/avis/ReviewForm';
import { isStorageConfigured } from '@/modules/fichiers/storage';
import { Title } from '@/components/ui/Title';

export const metadata: Metadata = {
  title: 'Laisser un avis',
  robots: { index: false, follow: false },
};

export default async function AvisTokenPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const review = await getReviewByToken(token);

  if (!review) {
    return (
      <main className="page-main">
        <div className="rounded-[var(--radius-lg)] border border-alert bg-alert-soft p-8 text-center">
          <Title as="h1" size="display" className="">
            Lien invalide
          </Title>
          <p className="mt-3 text-fg">Ce lien d’avis ne correspond à aucun rendez-vous.</p>
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
            {answered ? 'Avis déjà envoyé' : 'Lien expiré'}
          </Title>
          <p className="mt-3 text-muted">
            {answered
              ? 'Merci, ton avis a déjà été transmis.'
              : 'Ce lien d’avis a expiré. Tu peux toujours donner ton avis depuis la fiche de la prestation.'}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="page-main">
      <div className="rounded-[var(--radius-lg)] border border-line bg-card p-8 shadow-soft">
        <Title as="h1" size="display" className="">
          Ton avis sur « {review.service.name} »
        </Title>
        <div className="mt-6">
          <ReviewForm mode="token" token={token} photosEnabled={isStorageConfigured()} />
        </div>
      </div>
    </main>
  );
}
