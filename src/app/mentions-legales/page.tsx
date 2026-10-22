import type { Metadata } from 'next';
import { Mail, Scissors } from 'lucide-react';
import Link from 'next/link';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { ButtonLink } from '@/components/ui/Button';
import { Title } from '@/components/ui/Title';

export const metadata: Metadata = {
  title: 'Mentions légales',
  description:
    'Mentions légales de Hairstyle by Patricia : identité, coordonnées, hébergement et publication du site.',
  alternates: { canonical: '/mentions-legales' },
};

export default function MentionsLegalesPage() {
  return (
    <main className="page-main space-y-12">
      <Breadcrumb items={[{ label: 'Accueil', href: '/' }, { label: 'Mentions légales' }]} />

      <header className="max-w-3xl">
        <Title as="h1" size="display" className="">
          Mentions légales
        </Title>
      </header>

      <section className="max-w-3xl space-y-8">
        <Title as="h2" className="">
          1. Éditeur du site
        </Title>
        <dl className="space-y-4 text-muted leading-relaxed">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="bg-page p-6 rounded-xl border border-line">
              <dt className="font-medium text-fg mb-1">Nom commercial</dt>
              <dd>
                Hairstyle by Patricia - coiffure sur rendez-vous à Dakar, spécialisée dans les
                cheveux texturés.
              </dd>
            </div>
            <div className="bg-page p-6 rounded-xl border border-line">
              <dt className="font-medium text-fg mb-1">Activité</dt>
              <dd>Coiffures texturées : tresses, vanilles, locs, coiffures protectrices.</dd>
            </div>
          </div>
          <div className="bg-page p-6 rounded-xl border border-line">
            <dt className="font-medium text-fg mb-1">Contact</dt>
            <dd>
              E-mail :{' '}
              <a href="mailto:zepatricia7@gmail.com" className="text-cacao underline">
                zepatricia7@gmail.com
              </a>
            </dd>
          </div>
        </dl>
      </section>

      <section className="max-w-3xl space-y-8">
        <Title as="h2" className="">
          2. Hébergement
        </Title>
        <div className="bg-page p-6 rounded-xl border border-line">
          <p className="text-muted leading-relaxed">
            Ce site est hébergé sur une plateforme de cloud publique.
          </p>
        </div>
      </section>

      <section className="max-w-3xl space-y-8">
        <Title as="h2" className="">
          3. Publication et contenus
        </Title>
        <p className="text-muted leading-relaxed">
          La directrice de la publication est Patricia, gérante de Hairstyle by Patricia. Les
          textes, photos et visuels du site sont la propriété de Patricia ou utilisés avec
          l’autorisation de leurs auteurs. Toute reproduction est interdite sans accord écrit.
        </p>
      </section>

      <section className="max-w-3xl space-y-8">
        <Title as="h2" className="">
          4. Données personnelles
        </Title>
        <p className="text-muted leading-relaxed">
          Les données collectées via ce site font l’objet d’un traitement décrit dans la{' '}
          <Link href="/confidentialite" className="text-cacao underline font-medium">
            politique de confidentialité
          </Link>
          . Conformément au RGPD, vous disposez d’un droit d’accès, de rectification, de suppression
          et d’opposition sur vos données. Pour exercer ces droits, écrivez à{' '}
          <a href="mailto:zepatricia7@gmail.com" className="text-cacao underline">
            zepatricia7@gmail.com
          </a>
          .
        </p>
      </section>

      <section className="max-w-3xl rounded-2xl border border-line bg-page p-8 text-center md:p-10">
        <Title as="h2" className="">
          Une question ?
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
