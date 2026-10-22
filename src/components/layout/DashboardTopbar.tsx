import { Bell, ExternalLink, LogOut, MessageSquare, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { logout } from '@/modules/auth/actions';
import { Button, ButtonLink } from '@/components/ui/Button';
import { TopbarSettingsLink } from '@/components/layout/TopbarSettingsLink';
import { Logo } from '@/components/shared/Logo';

/* Barre du haut du dashboard : messages, notifications, site public, déconnexion.
   Boutons icône seule (libellé en infobulle et pour les lecteurs d'écran). */
function IconLink({
  href,
  label,
  icon,
  badge = 0,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
}) {
  return (
    <span className="relative inline-flex">
      <ButtonLink
        href={href}
        variant="ghost"
        size="sm"
        iconOnly
        icon={icon}
        aria-label={badge > 0 ? `${label}, ${badge} non lu${badge > 1 ? 's' : ''}` : label}
      >
        {label}
      </ButtonLink>
      {badge > 0 ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-0.5 -top-0.5 inline-flex min-w-4 items-center justify-center rounded-full bg-accent px-1 text-xs font-bold leading-4 text-accent-fg tabular-nums ring-2 ring-page"
        >
          {badge > 99 ? '99+' : badge}
        </span>
      ) : null}
    </span>
  );
}

export function DashboardTopbar({
  unreadMessages = 0,
  unreadNotifications = 0,
}: {
  unreadMessages?: number;
  unreadNotifications?: number;
}) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-2 border-b border-line/70 bg-page/85 px-3 backdrop-blur sm:px-5 lg:justify-end lg:px-8">
      <Link
        href="/dashboard"
        aria-label="Hairstyle by Patricia - accueil administration"
        className="flex items-center gap-2 lg:invisible"
      >
        <Logo markClassName="h-7 w-auto text-fg" showWordmark={false} />
        <span className="font-heading text-sm font-bold sm:hidden">Hairstyle by Patricia</span>
      </Link>
      <nav aria-label="Actions rapides" className="flex items-center gap-1">
        <IconLink
          href="/dashboard/messages"
          label="Messages"
          icon={MessageSquare}
          badge={unreadMessages}
        />
        <IconLink
          href="/dashboard/notifications"
          label="Notifications"
          icon={Bell}
          badge={unreadNotifications}
        />
        <IconLink href="/" label="Voir le site" icon={ExternalLink} />
        <TopbarSettingsLink />
        <form action={logout}>
          <Button type="submit" variant="dangerGhost" size="sm" iconOnly icon={LogOut}>
            Se déconnecter
          </Button>
        </form>
      </nav>
    </header>
  );
}
