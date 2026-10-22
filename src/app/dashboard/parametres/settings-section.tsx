import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Card } from '@/components/ui/Card';

/* Carte de paramètres : icône + titre + champs empilés. Partagée par les formulaires. */
export function SettingsSection({
  icon: Icon,
  title,
  children,
  className = '',
}: {
  icon: LucideIcon;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={className}>
      <h2 className="mb-3 flex items-center gap-2 font-heading text-lg font-bold text-fg">
        <Icon aria-hidden="true" className="size-5 text-accent" />
        {title}
      </h2>
      <div className="flex flex-col gap-3">{children}</div>
    </Card>
  );
}
