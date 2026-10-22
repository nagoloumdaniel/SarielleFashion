import { CalendarCheck, ChevronRight, Clock, MailCheck, MapPin, Sparkles } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { ContactForm } from './ContactForm';
import { SocialLinks } from '@/components/layout/SocialLinks';
import { ButtonLink } from '@/components/ui/Button';
import { Title } from '@/components/ui/Title';

export const metadata: Metadata = {
  title: 'Contact',
  description:
    'Contactez Sarielle Sarielle Fashion : questions, réservation, informations pratiques. Réponse rapide.',
  alternates: { canonical: '/contact' },
};

const INFOS = [
  {
    Icon: MailCheck,
    title: 'Réponse sous 24 h ouvrées',
    text: 'Par e-mail.',
  },
  {
    Icon: MapPin,
    title: 'Coiffure sur rendez-vous',
    text: 'Sarielle vous reçoit à Clausthal-Zellerfeld.',
  },
  {
    Icon: Clock,
    title: 'Sur rendez-vous',
    text: 'Selon les créneaux disponibles.',
  },
] as const;

export default function ContactPage() {
  return (
    <main className="page-main space-y-10">
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
            <span aria-current="page" className="font-medium text-fg">
              Contact
            </span>
          </li>
        </ol>
      </nav>

      <header className="max-w-3xl space-y-4">
        <Title as="h1" size="display">
          Écrivez-nous
        </Title>
      </header>

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-10">
        <section aria-label="Formulaire de contact" className="order-2 lg:order-1">
          <ContactForm />
        </section>

        <aside
          aria-label="Informations pratiques"
          className="order-1 space-y-6 rounded-[var(--radius-lg)] bg-gradient-soft p-6 sm:p-8 lg:order-2"
        >
          <h2 className="font-heading text-xl font-bold text-fg">Infos pratiques</h2>
          <ul className="space-y-5">
            {INFOS.map(({ Icon, title, text }) => (
              <li key={title} className="flex gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-card text-cacao shadow-soft">
                  <Icon aria-hidden="true" className="size-5" />
                </span>
                <div>
                  <p className="font-semibold text-fg">{title}</p>
                  <p className="text-sm text-muted">{text}</p>
                </div>
              </li>
            ))}
          </ul>

          <div className="border-t border-line pt-5">
            <div className="flex flex-col gap-2">
              <ButtonLink href="/coiffures" icon={CalendarCheck} className="w-full">
                Réserver un créneau
              </ButtonLink>
              <ButtonLink
                href="/demandes-personnalisees"
                variant="secondary"
                icon={Sparkles}
                className="w-full"
              >
                Demande personnalisée
              </ButtonLink>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-line pt-4">
            <p className="text-sm text-muted">Suivre Sarielle</p>
            <SocialLinks />
          </div>
        </aside>
      </div>
    </main>
  );
}
