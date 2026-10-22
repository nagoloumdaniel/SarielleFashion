import { CalendarCheck, Check, Mail } from 'lucide-react';
import type { Metadata } from 'next';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { ButtonLink } from '@/components/ui/Button';
import { Title } from '@/components/ui/Title';
import { formatOpeningHours } from '@/modules/parametres/hours';
import { getCachedSalonSettings } from '@/lib/public-cache';
import { DEFAULT_SALON_SETTINGS, type SalonSettingsData } from '@/modules/disponibilites/queries';
import { resolveBookingPolicy, splitParagraphs } from '@/modules/parametres/policies';
import { formatNoticeDelay } from '@/modules/reservations/policy';
import { homeServiceSentence } from '@/modules/parametres/home-service';

export const metadata: Metadata = {
  title: 'Informations pratiques',
  description:
    "Horaires, préparation du rendez-vous et politique d'annulation de Sarielle Fashion.",
  alternates: { canonical: '/infos-pratiques' },
};

const preparation = [
  'Viens avec des cheveux propres, démêlés et séchés.',
  'Si tu portes une coiffure existante, ne la défais pas la veille.',
  'Apporte une photo ou une inspiration du résultat souhaité si tu en as une.',
];

function buildCancellationRules(minutes: number) {
  const delay = minutes > 0 ? formatNoticeDelay(minutes) : 'le délai prévu';
  return [
    {
      label: 'Annulation à temps',
      description: `Tu peux annuler ton rendez-vous gratuitement en ligne jusqu’à ${delay} avant l’heure convenue, via le lien sécurisé reçu par e-mail.`,
    },
    {
      label: 'Annulation tardive',
      description: `Passé le délai de ${delay}, le lien d’annulation ne fonctionne plus et le créneau ne peut plus être proposé à d’autres personnes. Contacte Sarielle directement pour étudier ta situation.`,
    },
    {
      label: 'Absence',
      description:
        'En cas d’absence sans préavis, Sarielle se réserve le droit de demander un acompte pour toute réservation ultérieure.',
    },
    {
      label: 'Annulation par Sarielle',
      description:
        'Si Sarielle doit annuler pour un motif personnel (maladie, urgence), je te contacte sans délai et un nouveau rendez-vous t’est proposé en priorité, sans frais.',
    },
  ];
}

const DEFAULT_ADDRESS = 'Clausthal-Zellerfeld\nAllemagne';
const DEFAULT_CONTACT_EMAIL = 'sarielletalla@gmail.com';

async function loadSettings(): Promise<SalonSettingsData> {
  try {
    return await getCachedSalonSettings();
  } catch (error) {
    console.error('[infos-pratiques] paramètres illisibles, valeurs par défaut', error);
    return DEFAULT_SALON_SETTINGS;
  }
}

export default async function InfosPratiquesPage() {
  const settings = await loadSettings();
  const addressLines = (settings.address?.trim() || DEFAULT_ADDRESS)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const hoursLines = formatOpeningHours(settings.openingHours);
  const customCancellation = settings.cancellationPolicy?.trim() ?? '';
  const cancellationRules = customCancellation
    ? null
    : buildCancellationRules(settings.minCancelNoticeMinutes);
  const bookingParagraphs = splitParagraphs(resolveBookingPolicy(settings.bookingPolicy));
  return (
    <main className="page-main space-y-12">
      <Breadcrumb items={[{ label: 'Accueil', href: '/' }, { label: 'Informations pratiques' }]} />

      <header className="max-w-3xl">
        <Title as="h1" size="display" className="">
          Informations pratiques
        </Title>
      </header>

      {/* Coordonnées et horaires */}
      <section className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <div className="space-y-6 rounded-2xl bg-card p-8 shadow-soft">
          <Title as="h2" className="">
            Coordonnées
          </Title>
          <p className="text-muted">
            <span className="font-semibold text-fg">Adresse</span>
            <br />
            {addressLines.map((line, index) => (
              <span key={line}>
                {index > 0 ? <br /> : null}
                {line}
              </span>
            ))}
          </p>
          {settings.homeServiceEnabled ? (
            <p className="text-muted">
              <span className="font-semibold text-fg">Coiffure à domicile</span>
              <br />
              {homeServiceSentence(settings.travelFeeCents)}
            </p>
          ) : null}
          {settings.phone ? (
            <p className="text-muted">
              <span className="font-semibold text-fg">Téléphone</span>
              <br />
              {settings.phone}
            </p>
          ) : null}
          <p className="text-muted">
            <span className="font-semibold text-fg">E-mail</span>
            <br />
            {settings.contactEmail || DEFAULT_CONTACT_EMAIL}
          </p>
        </div>
        <div className="space-y-6 rounded-2xl bg-card p-8 shadow-soft">
          <Title as="h2" className="">
            Horaires
          </Title>
          {hoursLines.map((line) => (
            <p key={line} className="text-muted">
              {line}
            </p>
          ))}
          <p className="text-muted">
            Sur réservation uniquement. Merci d&apos;être à l&apos;heure.
          </p>
        </div>
      </section>

      {/* Préparation */}
      <section className="space-y-6">
        <Title as="h2" className="">
          Préparer ton rendez-vous
        </Title>
        <ul className="max-w-3xl space-y-3">
          {preparation.map((item) => (
            <li key={item} className="flex items-start gap-3 text-muted">
              <Check aria-hidden="true" className="mt-1 size-4 shrink-0 text-accent" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Conditions de réservation (paramètre « bookingPolicy » ou texte par défaut) */}
      <section className="space-y-6">
        <Title as="h2" className="">
          Conditions de réservation
        </Title>
        <div className="max-w-3xl space-y-3 border-l-4 border-accent pl-5">
          {bookingParagraphs.map((paragraph) => (
            <p key={paragraph} className="leading-relaxed text-muted">
              {paragraph}
            </p>
          ))}
        </div>
      </section>

      {/* Politique d'annulation (paramètre « cancellationPolicy » ou règles par défaut) */}
      <section className="space-y-6">
        <Title as="h2" className="">
          Politique d&apos;annulation
        </Title>
        {cancellationRules ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {cancellationRules.map((rule) => (
              <div key={rule.label} className="border-l-4 border-accent pl-5">
                <h3 className="font-heading text-xl font-bold text-fg">{rule.label}</h3>
                <p className="mt-1 leading-relaxed text-muted">{rule.description}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="max-w-3xl space-y-3 border-l-4 border-accent pl-5">
            {splitParagraphs(customCancellation).map((paragraph) => (
              <p key={paragraph} className="leading-relaxed text-muted">
                {paragraph}
              </p>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl bg-page p-8 text-center md:p-10">
        <Title as="h2" className="">
          Une question ?
        </Title>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <ButtonLink href="/contact" icon={Mail}>
            Nous contacter
          </ButtonLink>
          <ButtonLink href="/coiffures" variant="secondary" icon={CalendarCheck}>
            Réserver un créneau
          </ButtonLink>
        </div>
      </section>
    </main>
  );
}
