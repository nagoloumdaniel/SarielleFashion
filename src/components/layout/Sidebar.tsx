'use client';

import {
  CalendarDays,
  CalendarOff,
  ChartNoAxesColumn,
  ClipboardCheck,
  ClipboardList,
  Ellipsis,
  History,
  Hourglass,
  Images,
  LayoutDashboard,
  type LucideIcon,
  MessageSquareQuote,
  Scissors,
  Settings,
  Tag,
  Users,
  Wand2,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';

type NavItem = { href: string; label: string; icon: LucideIcon; primary?: boolean };

/* Navigation du dashboard. `primary` : entrées de la barre d'onglets mobile (le reste dans « Menu »). */
const NAV: ReadonlyArray<NavItem> = [
  { href: '/dashboard', label: 'Accueil', icon: LayoutDashboard, primary: true },
  { href: '/dashboard/calendrier', label: 'Calendrier', icon: CalendarDays, primary: true },
  { href: '/dashboard/reservations', label: 'Réservations', icon: ClipboardList, primary: true },
  { href: '/dashboard/clients', label: 'Clientes', icon: Users, primary: true },
  { href: '/dashboard/demandes', label: 'Demandes', icon: Wand2 },
  { href: '/dashboard/evaluations', label: 'Évaluations', icon: ClipboardCheck },
  { href: '/dashboard/catalogue', label: 'Catalogue', icon: Scissors },
  { href: '/dashboard/disponibilites', label: 'Disponibilités', icon: CalendarOff },
  { href: '/dashboard/liste-attente', label: 'Liste d’attente', icon: Hourglass },
  { href: '/dashboard/avis', label: 'Avis', icon: MessageSquareQuote },
  { href: '/dashboard/galerie', label: 'Galerie', icon: Images },
  { href: '/dashboard/promotions', label: 'Promotions', icon: Tag },
  { href: '/dashboard/statistiques', label: 'Statistiques', icon: ChartNoAxesColumn },
  { href: '/dashboard/historique', label: 'Historique', icon: History },
  { href: '/dashboard/parametres', label: 'Paramètres', icon: Settings },
];

function isActive(pathname: string | null, href: string) {
  // Les sous-pages (fiche prestation, etc.) gardent l'entrée active.
  return pathname === href || (href !== '/dashboard' && !!pathname?.startsWith(`${href}/`));
}

/* Groupes de la sidebar desktop (mêmes entrées que NAV, rien d'ajouté ni retiré). */
const GROUPS: ReadonlyArray<{ title: string; hrefs: ReadonlyArray<string> }> = [
  {
    title: 'Activité',
    hrefs: [
      '/dashboard',
      '/dashboard/calendrier',
      '/dashboard/reservations',
      '/dashboard/clients',
      '/dashboard/demandes',
      '/dashboard/evaluations',
    ],
  },
  {
    title: 'Offre',
    hrefs: [
      '/dashboard/catalogue',
      '/dashboard/disponibilites',
      '/dashboard/liste-attente',
      '/dashboard/promotions',
      '/dashboard/galerie',
    ],
  },
  {
    title: 'Suivi',
    hrefs: ['/dashboard/avis', '/dashboard/statistiques', '/dashboard/historique'],
  },
];

/* Desktop : liste verticale groupée dans la sidebar. */
export function Sidebar() {
  const pathname = usePathname();
  return (
    <nav aria-label="Navigation administration" className="flex flex-col gap-3 pb-3">
      {GROUPS.map((group) => (
        <section key={group.title} aria-labelledby={`nav-group-${group.title}`}>
          <h2
            id={`nav-group-${group.title}`}
            className="px-3 pb-1 text-xs font-semibold text-panel-fg/60"
          >
            {group.title}
          </h2>
          <ul className="flex flex-col">
            {group.hrefs.map((href) => {
              const item = NAV.find((entry) => entry.href === href);
              if (!item) return null;
              const active = isActive(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={`dash-nav-link group relative flex h-8 items-center gap-3 rounded-[var(--radius-md)] px-3 text-sm transition-colors ${
                      active
                        ? 'bg-panel-fg/10 font-semibold text-panel-fg'
                        : 'text-panel-fg/75 hover:bg-panel-fg/5 hover:text-panel-fg'
                    }`}
                  >
                    {active ? (
                      <span
                        aria-hidden="true"
                        className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-bright"
                      />
                    ) : null}
                    <item.icon
                      aria-hidden="true"
                      className={`size-[18px] shrink-0 ${active ? 'text-bright' : 'text-panel-fg/60 group-hover:text-panel-fg'}`}
                    />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </nav>
  );
}

/* Mobile : barre d'onglets fixe (4 entrées + Menu) ; le menu ouvre toutes les pages en grille d'icônes. */
export function MobileTabBar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const primary = NAV.filter((item) => item.primary);
  const secondaryActive = NAV.some((item) => !item.primary && isActive(pathname, item.href));

  const tab =
    'flex h-12 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-[var(--radius-md)] text-xs font-medium transition-colors';

  return (
    <>
      <nav
        aria-label="Navigation administration"
        className="fixed inset-x-0 bottom-0 z-40 flex gap-1 border-t border-panel-fg/10 bg-ink px-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] pt-1.5 text-panel-fg lg:hidden"
      >
        {primary.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={`${tab} ${active ? 'bg-panel-fg/10 text-bright' : 'text-panel-fg/70'}`}
            >
              <item.icon aria-hidden="true" className="size-5" />
              <span className="max-w-full truncate px-0.5">{item.label}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={menuOpen}
          className={`${tab} ${secondaryActive ? 'bg-panel-fg/10 text-bright' : 'text-panel-fg/70'}`}
        >
          <Ellipsis aria-hidden="true" className="size-5" />
          Menu
        </button>
      </nav>
      <Modal open={menuOpen} onClose={() => setMenuOpen(false)} title="Menu" size="sm">
        <ul className="grid grid-cols-3 gap-2">
          {NAV.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  aria-current={active ? 'page' : undefined}
                  className={`flex h-20 flex-col items-center justify-center gap-1.5 rounded-[var(--radius-md)] border px-1 text-center text-xs font-medium transition ${
                    active
                      ? 'border-accent bg-accent text-accent-fg'
                      : 'border-line bg-page text-fg hover:border-cacao'
                  }`}
                >
                  <item.icon aria-hidden="true" className="size-5" />
                  <span className="leading-tight">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </Modal>
    </>
  );
}
