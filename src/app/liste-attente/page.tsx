import type { Metadata } from 'next';
import { db } from '@/lib/db';
import { WaitlistForm } from './waitlist-form';
import { Title } from '@/components/ui/Title';

export const metadata: Metadata = {
  title: 'Liste d’attente - Hairstyle by Patricia',
  description: 'Soyez prévenue par e-mail si un créneau se libère pour la prestation souhaitée.',
};

export default async function ListeAttentePage() {
  const services = await db.service.findMany({
    where: { status: 'PUBLISHED', category: { active: true } },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });

  return (
    <main className="page-main">
      <Title as="h1" size="display" className="">
        Liste d’attente
      </Title>
      <p className="mt-2 text-muted">Vous serez prévenue par e-mail si ce créneau se libère.</p>
      <div className="mt-8 rounded-[var(--radius-lg)] border border-line bg-card p-8 shadow-soft">
        <WaitlistForm services={services} />
      </div>
    </main>
  );
}
