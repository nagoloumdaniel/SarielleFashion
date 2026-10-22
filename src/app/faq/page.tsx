import { Mail, Scissors } from 'lucide-react';
import type { Metadata } from 'next';
import { Accordion } from '@/components/ui/Accordion';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { ButtonLink } from '@/components/ui/Button';
import { Title } from '@/components/ui/Title';
import { getCachedSalonSettings } from '@/lib/public-cache';
import { homeServiceSentence } from '@/modules/parametres/home-service';
import { PAYMENT_SENTENCE } from '@/modules/parametres/payment';

export const metadata: Metadata = {
  title: 'FAQ',
  description:
    "Questions fréquentes sur les prestations, la réservation, l'annulation et les cheveux avec Sarielle Fashion.",
  alternates: { canonical: '/faq' },
};

const faqItems = [
  {
    id: 'reservation',
    title: 'Comment réserver un rendez-vous ?',
    content:
      'Parcours le catalogue, sélectionne la prestation qui te convient, réponds aux éventuelles questions de compatibilité, puis choisis ta date et ton heure. Tu reçois un e-mail de confirmation avec un lien de suivi sécurisé.',
  },
  {
    id: 'delai',
    title: 'Combien de temps à l’avance faut-il réserver ?',
    content:
      'Je te recommande de réserver au moins une semaine à l’avance, surtout pour les coiffures longues et les événements. Des créneaux de dernière minute restent parfois disponibles : contacte-moi pour vérifier.',
  },
  {
    id: 'cheveux',
    title: 'Quels types de cheveux coiffes-tu ?',
    content:
      'Je coiffe les femmes, les hommes et les enfants, et je réalise aussi du make-up, de la pose de lace et de cils. Chaque prestation est adaptée à ta nature de cheveux.',
  },
  {
    id: 'preparation',
    title: 'Comment préparer mes cheveux avant le rendez-vous ?',
    content:
      'Viens avec des cheveux propres, démêlés et séchés. Si tu as une coiffure existante, ne la défais pas la veille : je m’en occupe au début du rendez-vous.',
  },
  {
    id: 'duree',
    title: 'Combien de temps dure une prestation ?',
    content:
      'La durée dépend de la prestation et de ta longueur de cheveux. Chaque fiche du catalogue indique une durée indicative ; la durée réelle est confirmée avant de commencer.',
  },
  {
    id: 'prix',
    title: 'Comment sont fixés les prix ?',
    content:
      'Les prix dépendent de la longueur, de la densité et de la complexité de la coiffure. Le catalogue affiche un prix de départ ou une fourchette. Le tarif final est toujours confirmé avant de commencer la prestation.',
  },
  {
    id: 'paiement',
    title: 'Comment et quand puis-je payer ?',
    content: `${PAYMENT_SENTENCE} Le tarif final est confirmé avant de commencer la prestation.`,
  },
  {
    id: 'annulation',
    title: 'Quelle est la politique d’annulation ?',
    content:
      'Tu peux annuler ton rendez-vous gratuitement en ligne jusqu’à 30 minutes avant l’heure convenue, via le lien sécurisé reçu par e-mail. Passé ce délai, le lien ne fonctionne plus : contacte Sarielle directement. Les conditions détaillées dans les informations pratiques s’appliquent.',
  },
  {
    id: 'options',
    title: 'Puis-je ajouter des options à ma prestation ?',
    content:
      'Oui, la plupart des prestations proposent des options (soins, longueurs supplémentaires, motifs personnalisés). Tu les sélectionnes lors de la réservation ; elles influencent le prix et la durée.',
  },
];

/* L'option à domicile n'apparaît que si Sarielle l'a activée (paramètres du dashboard). */
async function loadHomeServiceItem() {
  try {
    const settings = await getCachedSalonSettings();
    if (!settings.homeServiceEnabled) return [];
    return [
      {
        id: 'domicile',
        title: 'Te déplaces-tu à domicile ?',
        content: `${homeServiceSentence(settings.travelFeeCents)} Sinon, je te reçois sur rendez-vous à Clausthal-Zellerfeld.`,
      },
    ];
  } catch (error) {
    console.error('[faq] paramètres illisibles, option à domicile masquée', error);
    return [];
  }
}

export default async function FaqPage() {
  const items = [...faqItems, ...(await loadHomeServiceItem())];
  return (
    <main className="page-main space-y-12">
      <Breadcrumb items={[{ label: 'Accueil', href: '/' }, { label: 'FAQ' }]} />

      <header className="max-w-3xl">
        <Title as="h1" size="display" className="">
          Vos questions, nos réponses
        </Title>
      </header>

      <section aria-labelledby="faq-titre">
        <h2 id="faq-titre" className="sr-only">
          Liste des questions fréquentes
        </h2>
        <Accordion items={items} />
      </section>

      <section className="mx-auto w-full max-w-3xl rounded-2xl bg-page p-8 text-center md:p-10">
        <Title as="h2" className="">
          Une autre question ?
        </Title>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <ButtonLink href="/contact" icon={Mail}>
            Nous contacter
          </ButtonLink>
          <ButtonLink href="/coiffures" variant="secondary" icon={Scissors}>
            Voir le catalogue
          </ButtonLink>
        </div>
      </section>
    </main>
  );
}
