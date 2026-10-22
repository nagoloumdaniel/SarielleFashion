import {
  ArrowRight,
  CalendarDays,
  Car,
  Clock,
  Eye,
  Images,
  LayoutGrid,
  Mail,
  MapPin,
  Palette,
  Scissors,
  Sparkles,
  Star,
  Wand2,
} from 'lucide-react';
import type { Metadata } from 'next';

import { I18nScope } from '@/i18n/client';
import type { Locale } from '@/i18n/config';
import { pageMetadata } from '@/i18n/metadata';
import { getI18n } from '@/i18n/server';
import { getServiceRatingSummaries, listLatestReviews } from '@/modules/avis/queries';
import { GalleryGrid } from '@/components/galerie/GalleryGrid';
import { listPublishedGalleryPhotos } from '@/modules/galerie/queries';
import { Stars } from '@/components/shared/Stars';
import { Title } from '@/components/ui/Title';
import { ButtonLink } from '@/components/ui/Button';
import { PrestationCard } from '@/components/catalogue/PrestationCard';
import {
  bookingHref,
  categoryLabel,
  formatDuration,
  formatPrice,
  serviceImages,
} from '@/lib/catalogue';
import { getCachedPopularServices } from '@/lib/popular-services';
import { getPublicHoursLines } from '@/lib/public-hours';
import { getCachedSalonSettings } from '@/lib/public-cache';
import { travelFeeFromLabel } from '@/modules/parametres/home-service';

export async function generateMetadata(): Promise<Metadata> {
  const { locale, messages } = await getI18n();
  const { meta } = messages.home;
  const base = pageMetadata({
    locale,
    path: '/',
    title: meta.title,
    description: meta.description,
  });
  return {
    ...base,
    title: { absolute: meta.title },
    openGraph: { ...base.openGraph, title: meta.ogTitle, description: meta.ogDescription },
  };
}

const EXPERTISE_ICONS = [Scissors, Palette, Wand2, Eye] as const;

/* Montant des frais de déplacement annoncé seulement si l'option à domicile est activée. */
async function loadTravelNote(
  locale: Locale,
  t: Awaited<ReturnType<typeof getI18n>>['t'],
): Promise<string> {
  try {
    const settings = await getCachedSalonSettings();
    if (settings.homeServiceEnabled && settings.travelFeeCents > 0) {
      return t('home.travel.feeWith', { fee: travelFeeFromLabel(settings.travelFeeCents, locale) });
    }
  } catch (error) {
    console.error('[accueil] paramètres illisibles, frais de déplacement non annoncés', error);
  }
  return t('home.travel.feeWithout');
}

// Les URLs signées des photos (1 h) restent valides : la page est régénérée toutes les 5 min.
export const revalidate = 300;

export default async function HomePage() {
  const { locale, messages, t } = await getI18n();
  const h = messages.home;
  const [reviews, popular, realisations, travelNote] = await Promise.all([
    listLatestReviews(3, locale).catch(() => []),
    getCachedPopularServices(),
    listPublishedGalleryPhotos(6).catch(() => []),
    loadTravelNote(locale, t),
  ]);
  const summaries = await getServiceRatingSummaries(popular.map((service) => service.id));
  const hoursLines = await getPublicHoursLines(locale);
  return (
    <I18nScope messages={{ catalogue: messages.catalogue }}>
      <main>
        {/* Hero typographique (aucune image) : grand titre, index des savoir-faire à droite. */}
        <section
          aria-labelledby="hero-title"
          className="landing-hero relative -mt-16 overflow-hidden md:-mt-[4.5rem]"
        >
          <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-6 pb-20 pt-32 sm:px-10 md:pt-40 lg:min-h-svh lg:grid-cols-[1.25fr_1fr] lg:gap-16 lg:pb-16">
            <div className="flex flex-col items-start gap-6">
              <p className="reveal inline-flex items-center gap-2 rounded-full border border-line bg-card px-4 py-1.5 text-sm font-semibold text-accent">
                <MapPin aria-hidden="true" className="size-4" />
                {h.hero.badge}
              </p>
              <Title as="h1" size="display" id="hero-title" className="landing-title">
                {h.hero.title}
              </Title>
              <p className="reveal max-w-xl text-lg leading-relaxed text-muted md:text-xl">
                {h.hero.text}
              </p>
              <div className="reveal flex w-full max-w-md flex-col gap-3 sm:flex-row">
                <ButtonLink href="/coiffures" icon={CalendarDays} className="flex-1">
                  {h.hero.reserve}
                </ButtonLink>
                <ButtonLink
                  href="/coiffures"
                  variant="secondary"
                  icon={LayoutGrid}
                  className="flex-1"
                >
                  {h.hero.catalogue}
                </ButtonLink>
              </div>
            </div>

            <ol aria-label={h.hero.indexAria} className="reveal landing-index">
              {h.expertises.map((e, i) => (
                <li key={e.title} className="landing-index-row">
                  <span aria-hidden="true" className="landing-index-num">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="font-heading text-2xl font-extrabold text-fg md:text-3xl">
                    {e.title}
                  </span>
                  <ArrowRight aria-hidden="true" className="ml-auto size-5 text-accent" />
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Chiffres clés */}
        <section aria-label={h.figuresAria} className="border-y border-line bg-card">
          <dl className="mx-auto grid max-w-7xl grid-cols-2 gap-y-8 px-6 py-10 sm:px-10 lg:grid-cols-4">
            {h.figures.map((f) => (
              <div
                key={f.label}
                className="space-y-1 lg:border-l lg:border-line lg:pl-8 lg:first:border-l-0 lg:first:pl-0"
              >
                <dd className="font-heading text-3xl font-extrabold text-accent md:text-4xl">
                  {f.value}
                </dd>
                <dt className="text-sm font-medium text-muted">{f.label}</dt>
              </div>
            ))}
          </dl>
        </section>

        <div className="page-main space-y-24 md:space-y-32">
          {/* Savoir-faire */}
          <section id="savoir-faire" className="space-y-10">
            <div className="max-w-2xl space-y-4">
              <Title as="h2">{h.skills.title}</Title>
              <p className="leading-relaxed text-muted">{h.skills.text}</p>
            </div>
            <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              {h.expertises.map((e, i) => {
                const Icon = EXPERTISE_ICONS[i] ?? Scissors;
                return (
                  <li
                    key={e.title}
                    className="rounded-[var(--radius-lg)] border border-line bg-card p-7 shadow-soft"
                  >
                    <span className="flex size-11 items-center justify-center rounded-[var(--radius-md)] bg-accent-soft text-accent">
                      <Icon aria-hidden="true" className="size-5" />
                    </span>
                    <h3 className="mt-5 font-heading text-xl font-extrabold text-fg">{e.title}</h3>
                    <p className="mt-2 leading-relaxed text-muted">{e.text}</p>
                  </li>
                );
              })}
            </ul>
            <ul aria-label={h.skills.audiencesAria} className="flex flex-wrap gap-2">
              {h.skills.audiences.map((a) => (
                <li
                  key={a}
                  className="rounded-full border border-line bg-card px-4 py-1.5 text-sm font-semibold text-fg"
                >
                  {a}
                </li>
              ))}
            </ul>
          </section>

          {/* Les plus réservées : section absente s'il n'y a aucune réservation. */}
          {popular.length > 0 ? (
            <section id="plus-reservees" className="space-y-10">
              <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
                <Title as="h2">{h.popular.title}</Title>
                <ButtonLink href="/coiffures" variant="secondary" icon={LayoutGrid}>
                  {h.popular.all}
                </ButtonLink>
              </div>
              <ul
                aria-label={h.popular.aria}
                className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
              >
                {popular.map((service) => (
                  <li key={service.id}>
                    <PrestationCard
                      href={`/coiffures/${service.slug}`}
                      bookHref={bookingHref(service.slug)}
                      images={serviceImages(service, locale)}
                      badge={categoryLabel(locale, service.category.slug, service.category.name)}
                      title={service.name}
                      price={formatPrice(service, locale)}
                      duration={formatDuration(service.durationMinutes, locale)}
                      rating={summaries[service.id]}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {/* Mes réalisations : section absente s'il n'y a aucune photo publiée. */}
          {realisations.length > 0 ? (
            <section id="realisations" aria-labelledby="realisations-titre" className="space-y-10">
              <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
                <Title as="h2" id="realisations-titre">
                  {h.realisations.title}
                </Title>
                <ButtonLink href="/galerie" variant="secondary" icon={Images}>
                  {h.realisations.all}
                </ButtonLink>
              </div>
              <GalleryGrid photos={realisations} label={h.realisations.aria} compact />
            </section>
          ) : null}

          {/* Étapes de réservation */}
          <section id="etapes" className="space-y-10">
            <Title as="h2">{h.steps.title}</Title>
            <ol className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {h.steps.items.map((step, i) => (
                <li
                  key={step.title}
                  className="rounded-[var(--radius-lg)] border border-line bg-card p-7"
                >
                  <span
                    aria-hidden="true"
                    className="home-step-number block font-heading font-extrabold text-accent"
                  >
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <h3 className="mb-2 mt-4 font-heading text-xl font-bold text-fg">{step.title}</h3>
                  <p className="leading-relaxed text-muted">{step.description}</p>
                </li>
              ))}
            </ol>
          </section>

          {/* À propos */}
          <section
            id="sarielle"
            className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_1.3fr] lg:gap-16"
          >
            <div className="space-y-5">
              <Title as="h2">{h.about.title}</Title>
              <p className="inline-flex items-center gap-2 text-sm font-semibold text-accent">
                <Star aria-hidden="true" className="size-4" />
                {h.about.tagline}
              </p>
            </div>
            <div className="space-y-5 leading-relaxed text-muted">
              <p>{h.about.p1}</p>
              <p>{h.about.p2}</p>
            </div>
          </section>

          {/* Déplacement */}
          <section
            id="deplacement"
            className="flex flex-col gap-6 rounded-[var(--radius-xl)] bg-footer p-8 text-panel-fg md:flex-row md:items-center md:justify-between md:p-12"
          >
            <div className="max-w-2xl space-y-3">
              <p className="inline-flex items-center gap-2 text-sm font-semibold text-bright">
                <Car aria-hidden="true" className="size-4" />
                {h.travel.badge}
              </p>
              <h2 className="font-heading text-2xl font-extrabold md:text-3xl">{h.travel.title}</h2>
              <p className="leading-relaxed opacity-80">
                {h.travel.text} {travelNote}
              </p>
            </div>
            <ButtonLink href="/contact" variant="onDark" icon={Mail} className="shrink-0">
              {h.travel.contact}
            </ButtonLink>
          </section>

          {/* Témoignages : avis réels publiés uniquement, jamais inventés. */}
          {reviews.length > 0 ? (
            <section id="temoignages" aria-labelledby="temoignages-titre" className="space-y-8">
              <Title as="h2" id="temoignages-titre">
                {h.testimonials.title}
              </Title>
              <ul className="grid grid-cols-1 gap-6 md:grid-cols-3">
                {reviews.map((review) => (
                  <li key={review.id}>
                    <figure className="flex h-full flex-col gap-4 rounded-[var(--radius-lg)] border border-line bg-card p-6 shadow-soft">
                      <Stars value={review.rating} />
                      <blockquote className="flex-1 whitespace-pre-line break-words text-lg leading-relaxed text-fg">
                        {locale === 'de' ? '„' : '« '}
                        {review.comment}
                        {locale === 'de' ? '“' : ' »'}
                      </blockquote>
                      <figcaption className="text-sm font-semibold text-fg">
                        {review.authorName}
                        <span className="font-normal text-muted"> · {review.serviceName}</span>
                      </figcaption>
                    </figure>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {/* Demande personnalisée */}
          <section className="rounded-[var(--radius-xl)] bg-accent-soft p-8 text-center md:p-14">
            <Title as="h2">{h.custom.title}</Title>
            <p className="mx-auto mt-4 max-w-2xl leading-relaxed text-muted">{h.custom.text}</p>
            <ButtonLink href="/demandes-personnalisees" icon={Sparkles} className="mt-8">
              {h.custom.action}
            </ButtonLink>
          </section>

          {/* Coordonnées */}
          <section id="contact" className="grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-12">
            <div className="space-y-6">
              <Title as="h2">{h.contact.title}</Title>
              <ButtonLink href="/contact" icon={Mail}>
                {h.contact.send}
              </ButtonLink>
            </div>
            <div className="space-y-4">
              <p className="flex items-start gap-3 text-fg">
                <MapPin aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-accent" />
                <span>{h.contact.address}</span>
              </p>
              <p className="flex items-start gap-3 text-fg">
                <Mail aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-accent" />
                <span>sarielletalla@gmail.com</span>
              </p>
              <p className="flex items-start gap-3 text-fg">
                <Clock aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-accent" />
                <span>
                  {hoursLines.map((line) => (
                    <span key={line} className="block">
                      {line}
                    </span>
                  ))}
                  <span className="block text-muted">{h.contact.byAppointment}</span>
                </span>
              </p>
            </div>
          </section>
        </div>
      </main>
    </I18nScope>
  );
}
