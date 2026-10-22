import {
  ArrowLeft,
  CalendarCheck,
  ChevronRight,
  Clock,
  Droplets,
  HandCoins,
  Info,
  MapPin,
} from 'lucide-react';
import type { Metadata } from 'next';
import { Link } from '@/i18n/link';
import { I18nScope } from '@/i18n/client';
import { absoluteUrl } from '@/i18n/config';
import { pageMetadata } from '@/i18n/metadata';
import { getI18n } from '@/i18n/server';
import { notFound } from 'next/navigation';
import { ReviewsSection } from '@/components/avis/ReviewsSection';
import { RatingLine } from '@/components/shared/Stars';
import { LOCAL_BUSINESS } from '@/components/seo/LocalBusiness';
import { ServiceCard } from '@/components/catalogue/ServiceCard';
import { ServiceGallery } from '@/components/catalogue/ServiceGallery';
import { db } from '@/lib/db';
import { Badge } from '@/components/ui/Badge';
import { ButtonLink } from '@/components/ui/Button';
import {
  bookingHref,
  categoryLabel,
  formatDuration,
  formatPrice,
  getPublishedServiceBySlug,
  hairLengthLabel,
  photoPolicyLabel as photoPolicyText,
  serviceGallery,
} from '@/lib/catalogue';
import { getCachedServices } from '@/lib/public-cache';
import { getServiceRatingSummaries, listServiceReviews } from '@/modules/avis/queries';
import { isStorageConfigured } from '@/modules/fichiers/storage';
import { Title } from '@/components/ui/Title';

type ServicePageProps = { params: Promise<{ slug: string }> };

// Cache ISR court : les modifications du catalogue déclenchent une revalidation.
export const revalidate = 300;

export async function generateStaticParams() {
  // Build sans base joignable (aperçu Vercel sans DATABASE_URL) : aucune page
  // pré-générée, les fiches se génèrent alors à la première visite (ISR).
  try {
    const services = await db.service.findMany({
      where: { status: 'PUBLISHED', category: { active: true } },
      select: { slug: true },
    });
    return services.map((service) => ({ slug: service.slug }));
  } catch {
    return [];
  }
}

function truncate(text: string | null, maxLength: number): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1).trimEnd()}…`;
}

export async function generateMetadata({ params }: ServicePageProps): Promise<Metadata> {
  const { slug } = await params;
  const { locale, t, messages } = await getI18n();
  const service = await getPublishedServiceBySlug(slug);
  if (!service) return { title: messages.catalogue.meta.notFound };

  // La description saisie par l'admin reste dans sa langue ; le texte de repli est traduit.
  const description =
    truncate(service.description, 160) ||
    t('catalogue.meta.serviceFallback', {
      name: service.name,
      price: formatPrice(service, locale),
      duration: formatDuration(service.durationMinutes, locale),
    });
  const base = pageMetadata({
    locale,
    path: `/coiffures/${service.slug}`,
    title: service.name,
    description,
  });
  return {
    ...base,
    openGraph: { ...base.openGraph, title: `${service.name} | Sarielle Fashion` },
  };
}

/** Coiffures de la même catégorie (hors fiche courante). Un échec ne doit jamais casser la fiche. */
async function getSimilarServices(categorySlug: string, currentId: string) {
  try {
    const result = await getCachedServices({ category: categorySlug, page: 1, pageSize: 4 });
    return result.services.filter((item) => item.id !== currentId).slice(0, 3);
  } catch {
    return [];
  }
}

const REASSURANCE_ICONS = [MapPin, HandCoins] as const;

export default async function ServicePage({ params }: ServicePageProps) {
  const { slug } = await params;
  const { locale, messages, t } = await getI18n();
  const sv = messages.catalogue.service;
  const service = await getPublishedServiceBySlug(slug);
  if (!service) notFound();
  const categoryName = categoryLabel(locale, service.category.slug, service.category.name);

  const similar = await getSimilarServices(service.category.slug, service.id);
  const [summaries, reviewPage] = await Promise.all([
    getServiceRatingSummaries([service.id, ...similar.map((item) => item.id)]),
    listServiceReviews(service.id, { locale }).catch(() => ({ items: [], hasMore: false })),
  ]);
  const summary = summaries[service.id] ?? { count: 0, average: 0 };
  const images = serviceGallery(service, locale);
  const compatibility = service.compatibility;
  const acceptedLengths = compatibility?.acceptedLengths ?? [];
  const photoPolicyLabel = compatibility
    ? photoPolicyText(compatibility.photoPolicy, locale)
    : null;
  /* Restriction capillaire = règle de compatibilité non vide ou question de diagnostic active.
     Sans restriction : ni bouton « Vérifier ma compatibilité » ni section dédiée (la
     validation serveur des règles à la réservation reste inchangée). */
  const hasRestrictions =
    service._count.questions > 0 ||
    (Boolean(compatibility) &&
      (acceptedLengths.length > 0 ||
        (compatibility?.acceptedHairTypes.length ?? 0) > 0 ||
        compatibility?.requiresLocs ||
        compatibility?.incompatibleLocs ||
        compatibility?.photoPolicy === 'REQUIRED' ||
        Boolean(compatibility?.conditionsNote) ||
        Boolean(compatibility?.incompatibleMessage) ||
        Boolean(compatibility?.uncertainMessage)));

  return (
    <I18nScope messages={{ catalogue: messages.catalogue }}>
      <main className="page-main space-y-8 md:space-y-10">
        <nav aria-label={t('common.breadcrumb')} className="text-sm text-muted">
          <ol className="flex flex-wrap items-center gap-2">
            <li>
              <Link href="/" className="transition hover:text-cacao">
                {t('catalogue.breadcrumb.home')}
              </Link>
            </li>
            <li aria-hidden="true">
              <ChevronRight className="size-3.5" />
            </li>
            <li>
              <Link href="/coiffures" className="transition hover:text-cacao">
                {t('catalogue.breadcrumb.catalogue')}
              </Link>
            </li>
            <li aria-hidden="true">
              <ChevronRight className="size-3.5" />
            </li>
            <li>
              <span aria-current="page" className="font-medium text-fg">
                {service.name}
              </span>
            </li>
          </ol>
        </nav>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-start lg:gap-x-12 lg:gap-y-10">
          {/* Galerie */}
          <ServiceGallery images={images} serviceName={service.name} />

          {/* Bloc de réservation : sticky sur grand écran, juste sous la galerie sur mobile. */}
          <section
            aria-label={sv.bookingAria}
            className="space-y-6 lg:sticky lg:top-28 lg:row-span-2 lg:self-start"
          >
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="neutral">{categoryName}</Badge>
                {service.options.length > 0 ? (
                  <Badge tone="accent">
                    {t('catalogue.service.optionsBadge', { count: service.options.length })}
                  </Badge>
                ) : null}
              </div>
              <Title as="h1" size="display">
                {service.name}
              </Title>
              {summary.count > 0 ? (
                <a
                  href="#avis"
                  className="inline-flex rounded-sm text-muted transition hover:text-accent"
                >
                  <RatingLine average={summary.average} count={summary.count} />
                </a>
              ) : null}
            </div>

            <div className="space-y-5 rounded-[var(--radius-xl)] border border-line bg-card p-5 shadow-soft md:p-6">
              <dl className="grid grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] gap-4">
                <div>
                  <dt className="flex items-center gap-1.5 text-sm text-muted">
                    <HandCoins aria-hidden="true" className="size-4" />
                    {sv.price}
                  </dt>
                  <dd className="mt-1 whitespace-nowrap font-heading text-xl font-bold leading-snug tabular-nums text-fg md:text-2xl">
                    {formatPrice(service, locale)}
                  </dd>
                </div>
                <div>
                  <dt className="flex items-center gap-1.5 text-sm text-muted">
                    <Clock aria-hidden="true" className="size-4" />
                    {sv.duration}
                  </dt>
                  <dd className="mt-1 font-heading text-xl font-bold leading-snug text-fg md:text-2xl">
                    {formatDuration(service.durationMinutes, locale)}
                  </dd>
                </div>
              </dl>

              {service.priceOnRequest ? (
                <p className="flex items-start gap-2 rounded-[var(--radius-md)] bg-accent-soft px-3 py-2 text-sm leading-relaxed text-fg">
                  <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-cacao" />
                  {sv.assessmentNote}
                </p>
              ) : null}

              <div className="flex flex-col gap-2">
                <ButtonLink
                  href={bookingHref(service.slug)}
                  icon={CalendarCheck}
                  className="w-full"
                >
                  {sv.reserve}
                </ButtonLink>
                {hasRestrictions ? (
                  <ButtonLink
                    href={`/compatibilite?service=${encodeURIComponent(service.slug)}`}
                    variant="secondary"
                    icon={Droplets}
                    className="w-full"
                  >
                    {sv.checkCompat}
                  </ButtonLink>
                ) : null}
              </div>

              <ul className="space-y-2 border-t border-line pt-4 text-sm text-muted">
                {sv.reassurances.map((text, i) => {
                  const Icon = REASSURANCE_ICONS[i] ?? MapPin;
                  return (
                    <li key={text} className="flex items-start gap-2.5">
                      <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-cacao" />
                      {text}
                    </li>
                  );
                })}
              </ul>
            </div>
          </section>

          {/* Détails */}
          <div className="space-y-10">
            {service.description ? (
              <section aria-labelledby="description-titre" className="space-y-3">
                <Title as="h2" id="description-titre">
                  {sv.about}
                </Title>
                <p className="max-w-prose whitespace-pre-line text-base leading-relaxed text-muted md:text-lg">
                  {service.description}
                </p>
              </section>
            ) : null}

            {service.options.length > 0 ? (
              <section aria-labelledby="options-titre" className="space-y-3">
                <Title as="h2" id="options-titre">
                  {sv.options}
                </Title>
                <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius-lg)] border border-line bg-card">
                  {service.options.map((option) => (
                    <li
                      key={option.id}
                      className="flex items-center justify-between gap-4 px-4 py-3 md:px-5"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-fg">{option.name}</p>
                        {option.durationMinutes > 0 ? (
                          <p className="flex items-center gap-1.5 text-sm text-muted">
                            <Clock aria-hidden="true" className="size-3.5" />+
                            {formatDuration(option.durationMinutes, locale)}
                          </p>
                        ) : null}
                      </div>
                      <p className="whitespace-nowrap font-semibold text-cacao">
                        +
                        {formatPrice(
                          {
                            priceFromCents: option.priceCents,
                            priceToCents: option.priceCents,
                            priceOnRequest: false,
                          },
                          locale,
                        )}
                      </p>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {hasRestrictions ? (
              <section aria-labelledby="compatibilite-titre" className="space-y-3">
                <Title as="h2" id="compatibilite-titre">
                  {sv.compat}
                </Title>
                <ul className="space-y-2 rounded-[var(--radius-lg)] border border-line bg-card p-5 text-muted">
                  {acceptedLengths.length > 0 ? (
                    <li>
                      <span className="font-semibold text-fg">{sv.acceptedLengths}</span>
                      {acceptedLengths.map((length) => hairLengthLabel(length, locale)).join(', ')}
                    </li>
                  ) : null}
                  {(compatibility?.acceptedHairTypes.length ?? 0) > 0 ? (
                    <li>
                      <span className="font-semibold text-fg">{sv.acceptedTypes}</span>
                      {compatibility?.acceptedHairTypes.join(', ')}
                    </li>
                  ) : null}
                  {compatibility?.requiresLocs ? <li>{sv.requiresLocs}</li> : null}
                  {compatibility?.incompatibleLocs ? <li>{sv.incompatibleLocs}</li> : null}
                  {photoPolicyLabel ? <li>{photoPolicyLabel}</li> : null}
                  {compatibility?.autoApprove ? null : <li>{sv.manualCheck}</li>}
                  {compatibility?.incompatibleMessage ? (
                    <li className="rounded-[var(--radius-sm)] bg-alert-soft px-3 py-2 text-alert">
                      {compatibility.incompatibleMessage}
                    </li>
                  ) : null}
                  {compatibility?.uncertainMessage ? (
                    <li className="rounded-[var(--radius-sm)] bg-accent-soft px-3 py-2 text-fg">
                      {compatibility.uncertainMessage}
                    </li>
                  ) : null}
                  {compatibility?.conditionsNote ? (
                    <li className="rounded-[var(--radius-sm)] bg-line px-3 py-2 text-fg">
                      <span className="font-semibold">{sv.conditions}</span>
                      {compatibility.conditionsNote}
                    </li>
                  ) : null}
                </ul>
              </section>
            ) : null}

            <section aria-labelledby="infos-titre" className="space-y-3">
              <Title as="h2" id="infos-titre">
                {sv.before}
              </Title>
              <ul className="space-y-2 text-muted">
                {sv.beforeItems.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          </div>
        </div>

        <ReviewsSection
          service={{ id: service.id, name: service.name }}
          summary={summary}
          reviews={reviewPage.items}
          hasMore={reviewPage.hasMore}
          photosEnabled={isStorageConfigured()}
          providerName={LOCAL_BUSINESS.name}
          url={absoluteUrl(locale, `/coiffures/${service.slug}`)}
        />

        {similar.length > 0 ? (
          <section
            aria-labelledby="similaires-titre"
            className="space-y-6 border-t border-line pt-8"
          >
            <Title as="h2" id="similaires-titre">
              {sv.similar}
            </Title>
            <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {similar.map((item) => (
                <li key={item.id}>
                  <ServiceCard service={item} rating={summaries[item.id]} />
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <div className="border-t border-line pt-6">
          <ButtonLink href="/coiffures" variant="ghost" icon={ArrowLeft}>
            {sv.back}
          </ButtonLink>
        </div>
      </main>
    </I18nScope>
  );
}
