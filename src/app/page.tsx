import {
  ArrowRight,
  CalendarDays,
  Car,
  Clock,
  Eye,
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

import { getApprovedReviews } from '@/modules/avis/queries';
import { Title } from '@/components/ui/Title';
import { ButtonLink } from '@/components/ui/Button';
import { PrestationCard } from '@/components/catalogue/PrestationCard';
import { bookingHref, formatDuration, formatPrice, serviceImages } from '@/lib/catalogue';
import { getCachedPopularServices } from '@/lib/popular-services';

export const metadata: Metadata = {
  title: { absolute: 'Sarielle Fashion | Coiffure, make-up, lace et cils à Clausthal-Zellerfeld' },
  description:
    'Coiffure femme, homme et enfant, make-up, pose de lace et de cils à Clausthal-Zellerfeld. Déplacement possible, réservation en ligne.',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'Sarielle Fashion | Coiffure, make-up, lace et cils',
    description: 'Ton prochain look. Un style qui te ressemble. Réserve ton rendez-vous en ligne.',
    type: 'website',
    url: '/',
  },
};

const expertises = [
  {
    icon: Scissors,
    title: 'Coiffure',
    text: 'Pour elles, pour eux et pour les enfants : une coiffure pensée pour ta nature de cheveux et ton quotidien.',
  },
  {
    icon: Palette,
    title: 'Make-up',
    text: 'Un maquillage qui révèle tes traits, du naturel lumineux au glamour d’un soir de fête.',
  },
  {
    icon: Wand2,
    title: 'Pose de lace',
    text: 'Une pose soignée et discrète, avec un rendu naturel et une tenue qui dure.',
  },
  {
    icon: Eye,
    title: 'Cils',
    text: 'Un regard sublimé, avec une pose précise et confortable.',
  },
];

const figures = [
  { value: '5 ans', label: 'd’expérience' },
  { value: '≈ 30', label: 'clientes et clients par mois' },
  { value: '4', label: 'savoir-faire' },
  { value: '100 %', label: 'priorité à ta satisfaction' },
];

const audiences = ['Femmes', 'Hommes', 'Enfants', 'Événements'];

const steps = [
  {
    number: '01',
    title: 'Choisis ta prestation',
    description: 'Parcours le catalogue et sélectionne ce qui te correspond.',
  },
  {
    number: '02',
    title: 'Vérifie la compatibilité',
    description: 'Réponds à quelques questions pour que le résultat te ressemble.',
  },
  {
    number: '03',
    title: 'Réserve ton créneau',
    description: 'Choisis la date et l’heure, puis confirme en quelques clics.',
  },
];

export default async function HomePage() {
  const [reviews, popular] = await Promise.all([getApprovedReviews(3), getCachedPopularServices()]);
  return (
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
              Clausthal-Zellerfeld · déplacement possible
            </p>
            <Title as="h1" size="display" id="hero-title" className="landing-title">
              Ton prochain look. Un style qui te ressemble.
            </Title>
            <p className="reveal max-w-xl text-lg leading-relaxed text-muted md:text-xl">
              Coiffure, make-up, pose de lace et de cils. Je prends soin de toi, avec une seule
              priorité : ta satisfaction.
            </p>
            <div className="reveal flex w-full max-w-md flex-col gap-3 sm:flex-row">
              <ButtonLink href="/coiffures" icon={CalendarDays} className="flex-1">
                Réserver
              </ButtonLink>
              <ButtonLink
                href="/coiffures"
                variant="secondary"
                icon={LayoutGrid}
                className="flex-1"
              >
                Voir le catalogue
              </ButtonLink>
            </div>
          </div>

          <ol aria-label="Mes savoir-faire" className="reveal landing-index">
            {expertises.map((e, i) => (
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
      <section aria-label="Sarielle Fashion en chiffres" className="border-y border-line bg-card">
        <dl className="mx-auto grid max-w-7xl grid-cols-2 gap-y-8 px-6 py-10 sm:px-10 lg:grid-cols-4">
          {figures.map((f) => (
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
            <Title as="h2">Mes savoir-faire</Title>
            <p className="leading-relaxed text-muted">
              La coiffure est ma passion, et chaque détail compte pour moi. Je reçois les femmes,
              les hommes, les enfants, et je t’accompagne aussi pour tes événements.
            </p>
          </div>
          <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {expertises.map((e) => (
              <li
                key={e.title}
                className="rounded-[var(--radius-lg)] border border-line bg-card p-7 shadow-soft"
              >
                <span className="flex size-11 items-center justify-center rounded-[var(--radius-md)] bg-accent-soft text-accent">
                  <e.icon aria-hidden="true" className="size-5" />
                </span>
                <h3 className="mt-5 font-heading text-xl font-extrabold text-fg">{e.title}</h3>
                <p className="mt-2 leading-relaxed text-muted">{e.text}</p>
              </li>
            ))}
          </ul>
          <ul aria-label="Pour qui" className="flex flex-wrap gap-2">
            {audiences.map((a) => (
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
              <Title as="h2">Les plus réservées</Title>
              <ButtonLink href="/coiffures" variant="secondary" icon={LayoutGrid}>
                Voir toutes les prestations
              </ButtonLink>
            </div>
            <ul
              aria-label="Les prestations les plus réservées"
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
          <ol className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {steps.map((step) => (
              <li
                key={step.number}
                className="rounded-[var(--radius-lg)] border border-line bg-card p-7"
              >
                <span
                  aria-hidden="true"
                  className="home-step-number block font-heading font-extrabold text-accent"
                >
                  {step.number}
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
            <Title as="h2">À propos de Sarielle</Title>
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-accent">
              <Star aria-hidden="true" className="size-4" />
              Priorité · discipline · valeurs
            </p>
          </div>
          <div className="space-y-5 leading-relaxed text-muted">
            <p>
              Depuis cinq ans, la coiffure est pour moi bien plus qu’un métier : c’est une passion.
              Je m’occupe des femmes comme des hommes, et je me forme en continu au make-up, à la
              pose de lace et aux cils.
            </p>
            <p>
              Chaque partie du travail compte, parce que ta satisfaction est ma priorité. J’aime le
              travail bien fait, la ponctualité et le respect : ce sont mes valeurs, et tu les
              retrouves à chaque rendez-vous.
            </p>
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
              Je me déplace
            </p>
            <h2 className="font-heading text-2xl font-extrabold md:text-3xl">
              À Clausthal-Zellerfeld, ou chez toi.
            </h2>
            <p className="leading-relaxed opacity-80">
              Je peux aussi venir à toi, pour un événement ou simplement par confort. Les frais de
              déplacement sont à ta charge et indiqués avant la réservation.
            </p>
          </div>
          <ButtonLink href="/contact" variant="onDark" icon={Mail} className="shrink-0">
            Me contacter
          </ButtonLink>
        </section>

        {/* Témoignages : avis réels approuvés uniquement, jamais inventés. */}
        {reviews.length > 0 ? (
          <section id="temoignages" className="space-y-8">
            <Title as="h2">Ils me font confiance</Title>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {reviews.map((review) => (
                <blockquote
                  key={review.id}
                  className="rounded-[var(--radius-lg)] border border-line bg-card p-6 text-muted shadow-soft"
                >
                  {review.comment ? <p className="mb-4 text-lg">« {review.comment} »</p> : null}
                  <footer className="text-sm font-semibold text-fg">
                    - {review.customer.name.split(' ')[0]} · {review.service.name}
                    {review.rating ? ` · ${review.rating}/5` : ''}
                  </footer>
                </blockquote>
              ))}
            </div>
          </section>
        ) : null}

        {/* Demande personnalisée */}
        <section className="rounded-[var(--radius-xl)] bg-accent-soft p-8 text-center md:p-14">
          <Title as="h2">Une idée précise en tête ?</Title>
          <p className="mx-auto mt-4 max-w-2xl leading-relaxed text-muted">
            Décris ton projet et joins jusqu’à trois photos d’inspiration. Je te propose une
            prestation adaptée.
          </p>
          <ButtonLink href="/demandes-personnalisees" icon={Sparkles} className="mt-8">
            Faire une demande
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
              <span>Clausthal-Zellerfeld, Allemagne</span>
            </p>
            <p className="flex items-start gap-3 text-fg">
              <Mail aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-accent" />
              <span>sarielletalla@gmail.com</span>
            </p>
            <p className="flex items-start gap-3 text-fg">
              <Clock aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-accent" />
              <span>Sur rendez-vous</span>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
