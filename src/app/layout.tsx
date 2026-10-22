import { ToastProvider } from '@/components/ui/Toast';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { HideOnAuth } from '@/components/layout/HideOnAuth';
import { LanguageSuggestion } from '@/components/layout/LanguageSuggestion';
import LocalBusiness from '@/components/seo/LocalBusiness';
import { LOCAL_BUSINESS } from '@/components/seo/LocalBusiness';
import type { Metadata } from 'next';
import { Inter, Manrope } from 'next/font/google';
import { THEME_SCRIPT } from '@/lib/inline-scripts';
import { HTML_LANG, OG_LOCALE, siteUrl } from '@/i18n/config';
import { LocaleProvider } from '@/i18n/client';
import { languageAlternates, socialImages } from '@/i18n/metadata';
import { getI18n } from '@/i18n/server';
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

export async function generateMetadata(): Promise<Metadata> {
  const { locale, messages } = await getI18n();
  const { meta } = messages.common;
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: meta.title, template: '%s | Sarielle Fashion' },
    description: meta.description,
    applicationName: 'Sarielle Fashion',
    authors: [{ name: 'Sarielle Fashion' }],
    keywords: meta.keywords,
    category: 'beauty',
    alternates: languageAlternates(locale, '/'),
    openGraph: {
      type: 'website',
      locale: OG_LOCALE[locale],
      url: '/',
      siteName: 'Sarielle Fashion',
      title: meta.ogTitle,
      description: meta.description,
      images: socialImages(locale, meta.ogTitle),
    },
    twitter: {
      card: 'summary_large_image',
      title: meta.ogTitle,
      description: meta.description,
      images: socialImages(locale, meta.ogTitle),
    },
    manifest: '/site.webmanifest',
    icons: {
      icon: [
        { url: '/icon.svg', type: 'image/svg+xml' },
        { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      ],
      apple: '/apple-icon.png',
    },
    robots: { index: true, follow: true },
  };
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { locale, messages } = await getI18n();
  // Seuls les espaces de noms communs sont envoyés au navigateur ; les pages ajoutent le leur (<I18nScope>).
  const clientMessages = { common: messages.common, nav: messages.nav };
  return (
    <html
      lang={HTML_LANG[locale]}
      className={`${inter.variable} ${manrope.variable}`}
      suppressHydrationWarning
    >
      <head>
        <meta name="theme-color" content="#fff8f7" />
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body suppressHydrationWarning>
        <LocaleProvider locale={locale} messages={clientMessages}>
          {/* P2.9 : lien d'evitement clavier */}
          <a
            href="#contenu"
            className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-accent focus:px-4 focus:py-2 focus:font-semibold focus:text-accent-fg"
          >
            {messages.common.skipToContent}
          </a>
          {/* P3.8 : donnees structurees LocalBusiness (JSON-LD) */}
          <LocalBusiness data={LOCAL_BUSINESS} locale={locale} />
          <ToastProvider>
            <Header />
            <div id="contenu">{children}</div>
            <HideOnAuth>
              <Footer />
              <LanguageSuggestion />
            </HideOnAuth>
          </ToastProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
