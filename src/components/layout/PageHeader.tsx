import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

/* En-tête commun des pages dashboard : icône + titre (+ description) à gauche, actions à droite.
   Les actions passent en icône seule sur mobile (Button `iconOnly="mobile"`). */
export function PageHeader({
  title,
  description,
  icon: Icon,
  actions,
  back,
}: {
  title: string;
  description?: ReactNode;
  icon?: LucideIcon;
  actions?: ReactNode;
  /** Lien / bouton de retour affiché au-dessus du titre. */
  back?: ReactNode;
}) {
  return (
    <header className="mb-4 flex flex-col gap-2 sm:mb-5">
      {back ? <div>{back}</div> : null}
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {Icon ? (
            <span
              aria-hidden="true"
              className="inline-flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-accent-soft text-accent"
            >
              <Icon className="size-5" />
            </span>
          ) : null}
          <div className="min-w-0">
            <h1 className="truncate font-heading text-xl font-bold leading-tight sm:text-2xl">
              {title}
            </h1>
            {description ? (
              <p className="mt-0.5 line-clamp-2 text-sm text-muted">{description}</p>
            ) : null}
          </div>
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}
