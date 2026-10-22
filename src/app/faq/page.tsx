import { Mail, Scissors } from 'lucide-react';
import type { Metadata } from 'next';
import { Accordion } from '@/components/ui/Accordion';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { ButtonLink } from '@/components/ui/Button';
import { Title } from '@/components/ui/Title';
import { getCachedSalonSettings } from '@/lib/public-cache';
import { homeServiceSentence } from '@/modules/parametres/home-service';

export const metadata: Metadata = {
  title: 'FAQ',
  description:
    "Questions fréquentes sur les prestations, la réservation, l'annulation et les cheveux avec Hairstyle by Patricia.",
  alternates: { canonical: '/faq' },
};

const faqItems = [
  {
    id: 'reservation',
    title: 'Comment réserver un rendez-vous ?',
    content:
      'Parcourez le catalogue, sélectionnez la prestation qui vous convient, répondez aux questions de compatibilité capillaire, puis choisissez votre date et votre heure. Vous recevez un e-mail de confirmation avec un lien de suivi sécurisé.',
  },
  {
    id: 'delai',
    title: 'Combien de temps à l’avance faut-il réserver ?',
    content:
      'Nous recommandons de réserver au moins une semaine à l’avance, surtout pour les tresses et les coiffures longues. Des créneaux de dernière minute restent parfois disponibles : contactez-nous pour vérifier.',
  },
  {
    id: 'cheveux',
    title: 'Quels types de cheveux accueillez-vous ?',
    content:
      'Patricia est spécialisée dans les cheveux texturés : tresses, vanilles, locs, départ de locs, coiffures protectrices et coupes. Chaque prestation est adaptée à votre nature de cheveux après un diagnostic capillaire.',
  },
  {
    id: 'preparation',
    title: 'Comment préparer mes cheveux avant le rendez-vous ?',
    content:
      'Venez avec des cheveux propres, démêlés et séchés. Si vous avez une coiffure existante (locs, tresses), ne la défaites pas la veille : nous nous en occupons au début du rendez-vous.',
  },
  {
    id: 'duree',
    title: 'Combien de temps dure une prestation ?',
    content:
      'La durée dépend de la coiffure et de votre longueur de cheveux. Chaque fiche du catalogue indique une durée indicative ; la durée réelle est confirmée lors du diagnostic de vos cheveux.',
  },
  {
    id: 'prix',
    title: 'Comment sont fixés les prix ?',
    content:
      'Les prix dépendent de la longueur, de la densité et de la complexité de la coiffure. Le catalogue affiche un prix de départ ou une fourchette. Le tarif final est toujours confirmé avant de commencer la prestation.',
  },
  {
    id: 'annulation',
    title: 'Quelle est la politique d’annulation ?',
    content:
      'Vous pouvez annuler ou déplacer votre rendez-vous gratuitement jusqu’à 24 heures avant l’heure convenue, via le lien sécurisé reçu par e-mail. Passé ce délai ou en cas d’absence, Patricia applique les conditions détaillées dans les informations pratiques.',
  },
  {
    id: 'options',
    title: 'Puis-je ajouter des options à ma prestation ?',
    content:
      'Oui, la plupart des prestations proposent des options (soins, longueurs supplémentaires, motifs personnalisés). Elles sont sélectionnables lors de la réservation et influencent le prix et la durée.',
  },
];

/* L'option à domicile n'apparaît que si Patricia l'a activée (paramètres du dashboard). */
async function loadHomeServiceItem() {
  try {
    const settings = await getCachedSalonSettings();
    if (!settings.homeServiceEnabled) return [];
    return [
      {
        id: 'domicile',
        title: 'Proposez-vous la coiffure à domicile ?',
        content: `${homeServiceSentence(settings.travelFeeCents)} Sans cette option, Patricia reçoit sur rendez-vous à Dakar.`,
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
