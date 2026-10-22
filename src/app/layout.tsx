import { ToastProvider } from '@/components/ui/Toast';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { HideOnAuth } from '@/components/layout/HideOnAuth';
import LocalBusiness from '@/components/seo/LocalBusiness';
import { LOCAL_BUSINESS } from '@/components/seo/LocalBusiness';
import type { Metadata } from 'next';
import { Inter, Manrope } from 'next/font/google';
import { THEME_SCRIPT } from '@/lib/inline-scripts';
import './globals.css';

/* P1.3 - polices optimisées via next/font : préchargement, swap,
   zéro requête externe, poids limités au strict nécessaire. */
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  style: ['normal', 'italic'],
  display: 'swap',
});

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope',
  display: 'swap',
});

const SITE_URL =
  process.env.NEXT_PUBLIC_APP_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : 'http://localhost:3000');
const SITE_DESCRIPTION =
  'Coiffure femme, homme et enfant, make-up, pose de lace et de cils à Clausthal-Zellerfeld. Déplacement possible, réservation en ligne.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Sarielle Fashion - Coiffure, make-up, lace et cils à Clausthal-Zellerfeld',
    template: '%s | Sarielle Fashion',
  },
  description: SITE_DESCRIPTION,
  applicationName: 'Sarielle Fashion',
  authors: [{ name: 'Sarielle Fashion' }],
  keywords: [
    'coiffure Clausthal-Zellerfeld',
    'make-up',
    'pose de lace',
    'pose de cils',
    'coiffure à domicile',
    'coiffure sur rendez-vous Clausthal-Zellerfeld',
    'cheveux naturels',
    'Sarielle Fashion',
  ],
  category: 'beauty',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'fr_DE',
    url: '/',
    siteName: 'Sarielle Fashion',
    title: 'Sarielle Fashion | Coiffure, make-up, lace et cils',
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sarielle Fashion | Coiffure, make-up, lace et cils',
    description: SITE_DESCRIPTION,
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" className={`${inter.variable} ${manrope.variable}`} suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#fff8f7" />
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body suppressHydrationWarning>
        {/* P2.9 : lien d'evitement clavier */}
        <a
          href="#contenu"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-accent focus:px-4 focus:py-2 focus:font-semibold focus:text-accent-fg"
        >
          Aller au contenu
        </a>
        {/* P3.8 : donnees structurees LocalBusiness (JSON-LD) */}
        <LocalBusiness data={LOCAL_BUSINESS} />
        <ToastProvider>
          <Header />
          <div id="contenu">{children}</div>
          <HideOnAuth>
            <Footer />
          </HideOnAuth>
        </ToastProvider>
      </body>
    </html>
  );
}
