import { CalendarCheck, ChevronRight, ImagePlus, Lock, PenLine, ShieldCheck } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { CustomRequestForm } from './custom-request-form';
import { Title } from '@/components/ui/Title';

export const metadata: Metadata = {
  title: 'Demande de coiffure personnalisée',
  description:
    'Décrivez votre coiffure sur mesure, ajoutez des photos de référence et recevez une réponse personnalisée de Patricia.',
  alternates: { canonical: '/demandes-personnalisees' },
  openGraph: {
    title: 'Demande de coiffure personnalisée - Hairstyle by Patricia',
    description: 'Décrivez votre coiffure sur mesure et recevez une réponse personnalisée.',
    url: '/demandes-personnalisees',
  },
};

const STEPS = [
  { Icon: PenLine, title: 'Décrivez votre coiffure', text: 'Votre idée, vos cheveux, vos photos.' },
  {
    Icon: ShieldCheck,
    title: 'Patricia étudie la faisabilité',
    text: 'Elle examine chaque demande.',
  },
  {
    Icon: CalendarCheck,
    title: 'Vous réservez si la proposition vous convient',
    text: 'Aucun engagement avant votre accord.',
  },
] as const;

export default function CustomRequestPage() {
  return (
    <main className="page-main space-y-10">
      <nav aria-label="Fil d'Ariane" className="text-sm text-ink-soft">
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
            <span aria-current="page" className="font-medium text-fg">
              Demande personnalisée
            </span>
          </li>
        </ol>
      </nav>

      <header className="max-w-3xl space-y-4">
        <Title as="h1" size="display">
          Une coiffure qui n’est pas au catalogue ?
        </Title>
        <p className="text-base leading-relaxed text-ink-soft md:text-lg">
          Décrivez votre projet et joignez jusqu’à 3 photos de référence. Patricia vous répond avec
          une proposition adaptée.
        </p>
      </header>

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-10">
        <section className="order-2 lg:order-1" aria-labelledby="formulaire-demande">
          <Title as="h2" id="formulaire-demande">
            Votre demande
          </Title>
          <p className="mt-2 flex items-center gap-2 text-sm text-ink-soft">
            <Lock aria-hidden="true" className="size-4 shrink-0 text-cacao" />
            Une demande ne réserve pas de créneau. Aucun paiement n’est demandé.
          </p>
          <div className="mt-5">
            <CustomRequestForm />
          </div>
        </section>

        <aside
          aria-label="Comment ça se passe"
          className="order-1 space-y-5 rounded-[var(--radius-lg)] bg-gradient-soft p-6 sm:p-8 lg:order-2"
        >
          <h2 className="font-heading text-xl font-bold text-fg">Comment ça se passe</h2>
          <ol className="space-y-5">
            {STEPS.map(({ Icon, title, text }) => (
              <li key={title} className="flex gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-card text-cacao shadow-soft">
                  <Icon aria-hidden="true" className="size-5" />
                </span>
                <div>
                  <p className="font-semibold text-fg">{title}</p>
                  <p className="text-sm text-ink-soft">{text}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="flex items-start gap-2 border-t border-line pt-4 text-sm text-ink-soft">
            <ImagePlus aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-cacao" />
            Photos nettes de face, de profil et de vos cheveux actuels.
          </p>
        </aside>
      </div>
    </main>
  );
}
