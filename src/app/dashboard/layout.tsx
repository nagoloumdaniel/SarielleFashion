import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { DashboardThemeLock } from '@/components/layout/DashboardThemeLock';
import { DashboardTopbar } from '@/components/layout/DashboardTopbar';
import { MobileTabBar, Sidebar } from '@/components/layout/Sidebar';
import { DASHBOARD_THEME_SCRIPT } from '@/lib/inline-scripts';
import { Logo } from '@/components/shared/Logo';
import { ConfirmProvider } from '@/components/ui/Confirm';
import { countUnreadCustomerMessages } from '@/modules/messagerie/queries';
import { countUnreadNotifications } from '@/modules/notifications/queries';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/* Les compteurs de badges ne bloquent pas le rendu de la page : la barre s'affiche
   immédiatement (sans badges) puis se complète en streaming. */
async function TopbarWithCounts() {
  const [unreadMessages, unreadNotifications] = await Promise.all([
    countUnreadCustomerMessages().catch(() => 0),
    countUnreadNotifications().catch(() => 0),
  ]);
  return (
    <DashboardTopbar unreadMessages={unreadMessages} unreadNotifications={unreadNotifications} />
  );
}

/* Coquille dashboard : thème unique (clair), sidebar sombre sur desktop,
   barre d'onglets fixe sur mobile. */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ConfirmProvider>
      <script dangerouslySetInnerHTML={{ __html: DASHBOARD_THEME_SCRIPT }} />
      <DashboardThemeLock />
      <div
        data-dashboard
        className="grid min-h-dvh w-full grid-cols-1 content-start lg:grid-cols-[232px_minmax(0,1fr)] lg:content-stretch"
      >
        <aside className="hidden min-w-0 border-r border-panel-fg/10 bg-ink px-3 pt-3 text-panel-fg lg:sticky lg:top-0 lg:block lg:h-dvh lg:self-start lg:overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <Link href="/dashboard" className="mb-2 flex h-12 items-center gap-2 px-3">
            <Logo markClassName="h-7 w-auto text-panel-fg" showWordmark={false} />
            <span className="font-heading text-sm font-bold text-panel-fg">Sarielle Fashion</span>
          </Link>
          <Sidebar />
        </aside>
        <div className="min-w-0">
          <Suspense fallback={<DashboardTopbar />}>
            <TopbarWithCounts />
          </Suspense>
          <main className="px-3 pb-24 pt-4 sm:px-5 sm:pt-5 lg:px-8 lg:pb-10">{children}</main>
        </div>
      </div>
      <MobileTabBar />
    </ConfirmProvider>
  );
}
