import { ExternalLink, History, Scissors } from 'lucide-react';
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { requireAdmin } from '@/modules/auth/guards';
import { getAdminServiceCore, listCategoryOptions } from '@/lib/catalogue-admin';
import { formatDuration, formatPrice } from '@/lib/catalogue';
import { adminUpdateService } from '@/modules/catalogue/actions';
import { PageHeader } from '@/components/layout/PageHeader';
import { BackButton } from '@/components/shared/BackButton';
import { Badge } from '@/components/ui/Badge';
import { ButtonLink } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Tabs } from '@/components/ui/Tabs';
import { ServiceForm } from '../../service-form';
import { ServiceHeaderActions } from './service-header-actions';
import {
  CompatibilitySection,
  ImagesSection,
  OptionsSection,
  QuestionsSection,
  Section,
} from './sections';

export const metadata: Metadata = { title: 'Modifier une prestation - Tableau de bord' };

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Brouillon',
  PUBLISHED: 'Publié',
  ARCHIVED: 'Archivé',
};

const STATUS_TONES: Record<string, 'accent' | 'success' | 'alert' | 'neutral'> = {
  DRAFT: 'neutral',
  PUBLISHED: 'success',
  ARCHIVED: 'alert',
};

export default async function ServiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdmin();
  const { id } = await params;
  if (!user) redirect(`/connexion?callbackUrl=/dashboard/catalogue/prestations/${id}`);

  // Données légères uniquement : les panneaux lourds se chargent en Suspense (voir sections.tsx).
  const [service, categories] = await Promise.all([getAdminServiceCore(id), listCategoryOptions()]);
  if (!service) notFound();

  const informationPanel = (
    <Card>
      <ServiceForm
        action={adminUpdateService}
        categories={categories}
        initial={service}
        submitLabel="Enregistrer"
      />
    </Card>
  );

  return (
    <div>
      <PageHeader
        icon={Scissors}
        title={service.name}
        back={<BackButton fallbackHref="/dashboard/catalogue" />}
        description={
          <>
            <Badge tone={STATUS_TONES[service.status] ?? 'neutral'} className="mr-2">
              {STATUS_LABELS[service.status] ?? service.status}
            </Badge>
            {service.categoryName} · {formatPrice(service)} ·{' '}
            {formatDuration(service.durationMinutes)}
          </>
        }
        actions={
          <>
            <ButtonLink
              href={`/dashboard/historique?entityId=${service.id}`}
              variant="secondary"
              icon={History}
              iconOnly="mobile"
            >
              Historique
            </ButtonLink>
            {service.status === 'PUBLISHED' ? (
              <ButtonLink
                href={`/coiffures/${service.slug}`}
                target="_blank"
                rel="noopener"
                variant="secondary"
                icon={ExternalLink}
                iconOnly="mobile"
              >
                Voir sur le site
              </ButtonLink>
            ) : null}
            <ServiceHeaderActions service={service} canDelete={service.appointmentCount === 0} />
          </>
        }
      />

      {service.appointmentCount > 0 ? (
        <p className="mb-3 rounded-[var(--radius-md)] bg-accent-soft px-3 py-2 text-sm">
          {service.appointmentCount} réservation{service.appointmentCount > 1 ? 's' : ''} rattachée
          {service.appointmentCount > 1 ? 's' : ''} : l’archivage est préféré à la suppression.
        </p>
      ) : null}

      <Tabs
        tabs={[
          { id: 'informations', label: 'Informations', content: informationPanel },
          {
            id: 'options',
            label: `Options (${service.counts.options})`,
            content: (
              <Section>
                <OptionsSection serviceId={service.id} />
              </Section>
            ),
          },
          {
            id: 'photos',
            label: `Photos (${service.counts.images})`,
            content: (
              <Section>
                <ImagesSection serviceId={service.id} />
              </Section>
            ),
          },
          {
            id: 'compatibilite',
            label: 'Compatibilité',
            content: (
              <Section>
                <CompatibilitySection serviceId={service.id} />
              </Section>
            ),
          },
          {
            id: 'questions',
            label: `Questions (${service.counts.questions})`,
            content: (
              <Section>
                <QuestionsSection serviceId={service.id} />
              </Section>
            ),
          },
        ]}
      />
    </div>
  );
}
