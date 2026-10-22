import { CalendarDays, Clock, LayoutGrid, Mail, MapPin, Sparkles } from 'lucide-react';
import Image from 'next/image';
import type { Metadata } from 'next';

import { getApprovedReviews } from '@/modules/avis/queries';
import { Title } from '@/components/ui/Title';
import { ButtonLink } from '@/components/ui/Button';
import { PrestationCard } from '@/components/catalogue/PrestationCard';
import { bookingHref, formatDuration, formatPrice, serviceImages } from '@/lib/catalogue';
import { getCachedPopularServices } from '@/lib/popular-services';

export const metadata: Metadata = {
  title: { absolute: 'Hairstyle by Patricia | Locs, nattes collées et vanilles à Dakar' },
  description:
    'Départ et retwist de locs, nattes collées, vanilles. Coiffure sur rendez-vous à Dakar, diagnostic capillaire et réservation en ligne.',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'Hairstyle by Patricia | Locs, nattes collées et vanilles à Dakar',
    description:
      'Départ et retwist de locs, nattes collées, vanilles. Prenez rendez-vous en quelques clics.',
    type: 'website',
    url: '/',
  },
};

const steps = [
  {
    number: '1',
    title: 'Choisissez votre coiffure',
    description: 'Parcourez le catalogue et sélectionnez une prestation.',
  },
  {
    number: '2',
    title: 'Vérifiez la compatibilité',
    description: 'Répondez à quelques questions sur vos cheveux.',
  },
  {
    number: '3',
    title: 'Réservez votre créneau',
    description: 'Choisissez la date et l’heure, puis confirmez.',
  },
];

export default async function HomePage() {
  const [reviews, popular] = await Promise.all([getApprovedReviews(3), getCachedPopularServices()]);
  return (
    <main>
      {/* Hero plein écran : texte à gauche, portrait arrondi à droite avec petites cartes
          qui débordent du cadre (pas de fond blanc). Navbar flottante intacte. */}
      <section
        aria-labelledby="hero-title"
        className="landing-hero relative -mt-[4.75rem] min-h-svh overflow-hidden bg-hero md:-mt-24 lg:h-svh lg:min-h-[40rem]"
      >
        <div className="mx-auto grid h-full max-w-7xl grid-cols-1 items-center gap-10 px-6 pb-12 pt-32 sm:px-10 md:pt-36 lg:grid-cols-2 lg:gap-8 lg:pb-8 lg:pt-28">
          {/* Texte + actions */}
          <div className="flex flex-col items-center gap-5 text-center lg:items-start lg:text-left">
            <Title as="h1" size="display" id="hero-title" className="landing-title title-on-dark">
              Hairstyle by Patricia
            </Title>
            <p className="reveal max-w-xl text-lg text-panel-fg md:text-xl">
              Départ et retwist de locs, nattes collées, vanilles.
            </p>
            <div
              className="reveal flex w-full max-w-sm flex-row gap-3 lg:max-w-sm"
              style={{ animationDelay: '200ms' }}
            >
              <ButtonLink href="/coiffures" icon={CalendarDays} className="flex-1">
                Réserver
              </ButtonLink>
              <ButtonLink href="/coiffures" variant="onDark" icon={LayoutGrid} className="flex-1">
                Catalogue
              </ButtonLink>
            </div>
          </div>

          {/* Portrait dans un cercle qui se déforme en continu */}
          <div
            className="reveal relative mx-auto flex w-full max-w-[16rem] justify-center sm:max-w-[21rem] lg:max-w-none lg:justify-end lg:pr-10"
            style={{ animationDelay: '120ms' }}
          >
            <div className="landing-blob-ring relative aspect-square w-full max-w-[21rem] lg:h-[min(58svh,29rem)] lg:w-auto lg:max-w-none">
              <div className="landing-blob relative size-full shadow-lift">
                <Image
                  src="/landing/landing.jpeg"
                  alt="Patricia coiffe un client : retwist de locs et nattes collées"
                  fill
                  priority
                  quality={90}
                  sizes="(max-width: 1024px) 21rem, 29rem"
                  className="object-cover object-[62%_30%]"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="page-main space-y-24 md:space-y-32">
        {/* Les plus réservées : section absente s'il n'y a aucune réservation. */}
        {popular.length > 0 ? (
          <section id="plus-reservees" className="space-y-10">
            <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
              <Title as="h2">Les plus réservées</Title>
              <ButtonLink href="/coiffures" variant="secondary" icon={LayoutGrid}>
                Voir toutes les coiffures
              </ButtonLink>
            </div>
            <ul
              aria-label="Les coiffures les plus réservées"
              className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
            >
              {popular.map((service) => (
                <li key={service.id}>
                  <PrestationCard
                    href={`/coiffures/${service.slug}`}
                    bookHref={bookingHref(service.slug)}
                    images={serviceImages(service)}
                    badge={service.category.name}
                    title={service.name}
                    price={formatPrice(service)}
                    duration={formatDuration(service.durationMinutes)}
                  />
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {/* Étapes de réservation */}
        <section id="etapes" className="space-y-10">
          <Title as="h2">Comment ça marche</Title>
          <ol className="grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-12">
            {steps.map((step) => (
              <li key={step.number} className="border-t border-line pt-6">
                <span
                  aria-hidden="true"
                  className="home-step-number text-gradient-primary block font-heading font-black italic"
                >
                  {step.number}
                </span>
                <h3 className="mb-2 mt-4 font-heading text-xl font-bold text-fg">{step.title}</h3>
                <p className="max-w-sm leading-relaxed text-muted">{step.description}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Présentation Patricia */}
        <section id="patricia" className="mx-auto max-w-3xl space-y-6 text-center">
          <Title as="h2">À propos de Patricia</Title>
          <p className="leading-relaxed text-muted">
            Depuis novembre 2025, Patricia coiffe les cheveux naturels : locs et nattes collées,
            pour les hommes comme pour les femmes. Autodidacte, elle a déjà coiffé plus de 40
            clients.
          </p>
          <p className="leading-relaxed text-muted">
            Avant de commencer, elle regarde avec vous votre nature de cheveux pour choisir la
            coiffure qui vous va.
          </p>
        </section>

        {/* Témoignages (P8.10) : avis réels approuvés uniquement, jamais inventés. */}
        {reviews.length > 0 ? (
          <section id="temoignages" className="space-y-8">
            <Title as="h2">Elles nous font confiance</Title>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {reviews.map((review) => (
                <blockquote
                  key={review.id}
                  className="rounded-[var(--radius-lg)] bg-card p-6 italic text-muted shadow-soft"
                >
                  {review.comment ? <p className="text-lg mb-4">« {review.comment} »</p> : null}
                  <footer className="text-sm font-semibold text-fg not-italic">
                    - {review.customer.name.split(' ')[0]} · {review.service.name}
                    {review.rating ? ` · ${review.rating}/5` : ''}
                  </footer>
                </blockquote>
              ))}
            </div>
          </section>
        ) : null}

        {/* Demande personnalisée */}
        <section className="bg-gradient-soft rounded-2xl border border-line p-8 text-center shadow-soft md:p-14">
          <Title as="h2">Une coiffure sur mesure en tête ?</Title>
          <p className="mx-auto mt-4 max-w-2xl leading-relaxed text-ink-soft">
            Décrivez votre projet et joignez jusqu’à trois photos de référence. Patricia vous
            propose une prestation adaptée.
          </p>
          <ButtonLink href="/demandes-personnalisees" icon={Sparkles} className="mt-8">
            Demande personnalisée
          </ButtonLink>
        </section>

        {/* Coordonnées */}
        <section id="contact" className="grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-12">
          <div className="space-y-6">
            <Title as="h2">Contact</Title>
            <ButtonLink href="/contact" icon={Mail}>
              Envoyer un message
            </ButtonLink>
          </div>
          <div className="space-y-4">
            <p className="flex items-start gap-3 text-fg">
              <MapPin aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-accent" />
              <span>Ouest - Foire, Dakar, Sénégal</span>
            </p>
            <p className="flex items-start gap-3 text-fg">
              <Mail aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-accent" />
              <span>zepatricia7@gmail.com</span>
            </p>
            <p className="flex items-start gap-3 text-fg">
              <Clock aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-accent" />
              <span>Lundi - Dimanche : 5h - 22h</span>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
