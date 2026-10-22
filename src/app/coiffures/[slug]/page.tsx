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
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ServiceCard } from '@/components/catalogue/ServiceCard';
import { ServiceGallery } from '@/components/catalogue/ServiceGallery';
import { db } from '@/lib/db';
import { Badge } from '@/components/ui/Badge';
import { ButtonLink } from '@/components/ui/Button';
import {
  HAIR_LENGTH_LABELS,
  PHOTO_POLICY_LABELS,
  bookingHref,
  formatDuration,
  formatPrice,
  getPublishedServiceBySlug,
  serviceGallery,
} from '@/lib/catalogue';
import { getCachedServices } from '@/lib/public-cache';
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
  const service = await getPublishedServiceBySlug(slug);
  if (!service) return { title: 'Coiffure introuvable' };

  const description = truncate(service.description, 160);
  return {
    title: service.name,
    description:
      description ||
      `${service.name} chez Hairstyle by Patricia : ${formatPrice(service)}, ${formatDuration(service.durationMinutes)}. Réservez en ligne.`,
    alternates: { canonical: `/coiffures/${service.slug}` },
    openGraph: {
      title: `${service.name} | Hairstyle by Patricia`,
      description,
      type: 'website',
      url: `/coiffures/${service.slug}`,
    },
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

const REASSURANCES = [
  { icon: MapPin, text: 'Patricia vous reçoit à Dakar, sur rendez-vous.' },
  { icon: HandCoins, text: 'Paiement sur place, aucun paiement en ligne.' },
] as const;

export default async function ServicePage({ params }: ServicePageProps) {
  const { slug } = await params;
  const service = await getPublishedServiceBySlug(slug);
  if (!service) notFound();

  const similar = await getSimilarServices(service.category.slug, service.id);
  const images = serviceGallery(service);
  const compatibility = service.compatibility;
  const acceptedLengths = compatibility?.acceptedLengths ?? [];
  const photoPolicyLabel = compatibility ? PHOTO_POLICY_LABELS[compatibility.photoPolicy] : null;
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
    <main className="page-main space-y-8 md:space-y-10">
      <nav aria-label="Fil d'Ariane" className="text-sm text-muted">
        <ol className="flex flex-wrap items-center gap-2">
          <li>
            <Link href="/" className="transition hover:text-cacao">
              Accueil
            </Link>
          </li>
          <li aria-hidden="true">
            <ChevronRight className="size-3.5" />
          </li>
          <li>
            <Link href="/coiffures" className="transition hover:text-cacao">
              Coiffures
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
          aria-label="Réservation"
          className="space-y-6 lg:sticky lg:top-28 lg:row-span-2 lg:self-start"
        >
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="neutral">{service.category.name}</Badge>
              {service.options.length > 0 ? (
                <Badge tone="accent">
                  {service.options.length} option{service.options.length > 1 ? 's' : ''}
                </Badge>
              ) : null}
            </div>
            <Title as="h1" size="display">
              {service.name}
            </Title>
          </div>

          <div className="space-y-5 rounded-[var(--radius-xl)] border border-line bg-card p-5 shadow-soft md:p-6">
            <dl className="grid grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] gap-4">
              <div>
                <dt className="flex items-center gap-1.5 text-sm text-muted">
                  <HandCoins aria-hidden="true" className="size-4" />
                  Tarif
                </dt>
                <dd className="mt-1 whitespace-nowrap font-heading text-xl font-bold leading-snug tabular-nums text-fg md:text-2xl">
                  {formatPrice(service)}
                </dd>
              </div>
              <div>
                <dt className="flex items-center gap-1.5 text-sm text-muted">
                  <Clock aria-hidden="true" className="size-4" />
                  Durée estimée
                </dt>
                <dd className="mt-1 font-heading text-xl font-bold leading-snug text-fg md:text-2xl">
                  {formatDuration(service.durationMinutes)}
                </dd>
              </div>
            </dl>

            {service.priceOnRequest ? (
              <p className="flex items-start gap-2 rounded-[var(--radius-md)] bg-accent-soft px-3 py-2 text-sm leading-relaxed text-fg">
                <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-cacao" />
                Une évaluation de vos cheveux est nécessaire avant de confirmer le rendez-vous et le
                tarif.
              </p>
            ) : null}

            <div className="flex flex-col gap-2">
              <ButtonLink href={bookingHref(service.slug)} icon={CalendarCheck} className="w-full">
                Réserver cette prestation
              </ButtonLink>
              {hasRestrictions ? (
                <ButtonLink
                  href={`/compatibilite?service=${encodeURIComponent(service.slug)}`}
                  variant="secondary"
                  icon={Droplets}
                  className="w-full"
                >
                  Vérifier ma compatibilité
                </ButtonLink>
              ) : null}
            </div>

            <ul className="space-y-2 border-t border-line pt-4 text-sm text-muted">
              {REASSURANCES.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-start gap-2.5">
                  <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-cacao" />
                  {text}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Détails */}
        <div className="space-y-10">
          {service.description ? (
            <section aria-labelledby="description-titre" className="space-y-3">
              <Title as="h2" id="description-titre">
                À propos de cette coiffure
              </Title>
              <p className="max-w-prose whitespace-pre-line text-base leading-relaxed text-muted md:text-lg">
                {service.description}
              </p>
            </section>
          ) : null}

          {service.options.length > 0 ? (
            <section aria-labelledby="options-titre" className="space-y-3">
              <Title as="h2" id="options-titre">
                Options disponibles
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
                          {formatDuration(option.durationMinutes)}
                        </p>
                      ) : null}
                    </div>
                    <p className="whitespace-nowrap font-semibold text-cacao">
                      +
                      {formatPrice({
                        priceFromCents: option.priceCents,
                        priceToCents: option.priceCents,
                        priceOnRequest: false,
                      })}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {hasRestrictions ? (
            <section aria-labelledby="compatibilite-titre" className="space-y-3">
              <Title as="h2" id="compatibilite-titre">
                Compatibilité capillaire
              </Title>
              <ul className="space-y-2 rounded-[var(--radius-lg)] border border-line bg-card p-5 text-muted">
                {acceptedLengths.length > 0 ? (
                  <li>
                    <span className="font-semibold text-fg">Longueurs acceptées : </span>
                    {acceptedLengths.map((length) => HAIR_LENGTH_LABELS[length]).join(', ')}
                  </li>
                ) : null}
                {(compatibility?.acceptedHairTypes.length ?? 0) > 0 ? (
                  <li>
                    <span className="font-semibold text-fg">Types de cheveux acceptés : </span>
                    {compatibility?.acceptedHairTypes.join(', ')}
                  </li>
                ) : null}
                {compatibility?.requiresLocs ? (
                  <li>Cette prestation nécessite des locs déjà posées.</li>
                ) : null}
                {compatibility?.incompatibleLocs ? (
                  <li>Cette prestation n’est pas compatible avec des locs.</li>
                ) : null}
                {photoPolicyLabel ? <li>{photoPolicyLabel}</li> : null}
                {compatibility?.autoApprove ? null : (
                  <li>Patricia vérifie les informations capillaires avant de confirmer.</li>
                )}
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
                    <span className="font-semibold">Conditions : </span>
                    {compatibility.conditionsNote}
                  </li>
                ) : null}
              </ul>
            </section>
          ) : null}

          <section aria-labelledby="infos-titre" className="space-y-3">
            <Title as="h2" id="infos-titre">
              Avant votre rendez-vous
            </Title>
            <ul className="space-y-2 text-muted">
              <li>Cheveux propres et démêlés.</li>
              <li>Signalez toute allergie ou sensibilité du cuir chevelu.</li>
              <li>La durée est une estimation : elle varie selon la longueur et la densité.</li>
            </ul>
          </section>
        </div>
      </div>

      {similar.length > 0 ? (
        <section aria-labelledby="similaires-titre" className="space-y-6 border-t border-line pt-8">
          <Title as="h2" id="similaires-titre">
            Coiffures similaires
          </Title>
          <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {similar.map((item) => (
              <li key={item.id}>
                <ServiceCard service={item} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="border-t border-line pt-6">
        <ButtonLink href="/coiffures" variant="ghost" icon={ArrowLeft}>
          Retour au catalogue
        </ButtonLink>
      </div>
    </main>
  );
}
