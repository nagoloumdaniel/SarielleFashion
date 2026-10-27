import { Suspense, type ReactNode } from 'react';
import {
  getAdminServiceCompatibility,
  getAdminServiceOptions,
  getAdminServiceQuestions,
} from '@/lib/catalogue-admin';
import { Skeleton } from '@/components/shared/Skeleton';
import { CompatibilityPanel } from './compatibility-panel';
import { OptionsPanel } from './options-panel';
import { QuestionsPanel } from './questions-panel';

/* ============================================================
 * Panneaux de la fiche prestation, chargés chacun dans leur propre
 * frontière Suspense : l'en-tête et le formulaire s'affichent sans
 * attendre les photos questions ou règles de
 * compatibilité, et les lectures partent en parallèle.
 * ============================================================ */

function PanelSkeleton() {
  return (
    <div role="status" aria-label="Chargement" className="rounded-[var(--radius-lg)] bg-card p-4">
      <Skeleton className="h-5 w-2/3" />
      <Skeleton className="mt-3 h-16 w-full" />
      <Skeleton className="mt-2 h-16 w-full" />
    </div>
  );
}

export function Section({ children }: { children: ReactNode }) {
  return <Suspense fallback={<PanelSkeleton />}>{children}</Suspense>;
}

export async function OptionsSection({ serviceId }: { serviceId: string }) {
  const options = await getAdminServiceOptions(serviceId);
  return <OptionsPanel serviceId={serviceId} options={options} />;
}

export async function CompatibilitySection({ serviceId }: { serviceId: string }) {
  const rule = await getAdminServiceCompatibility(serviceId);
  return <CompatibilityPanel serviceId={serviceId} rule={rule} />;
}

export async function QuestionsSection({ serviceId }: { serviceId: string }) {
  const questions = await getAdminServiceQuestions(serviceId);
  return <QuestionsPanel serviceId={serviceId} questions={questions} />;
}
