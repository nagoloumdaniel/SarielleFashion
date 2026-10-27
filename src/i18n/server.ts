import { headers } from 'next/headers';
import { DEFAULT_LOCALE, LOCALE_HEADER, isLocale, localePath, type Locale } from './config';
import { localizeMessage } from './server-messages';
import { getMessagesFor, type Messages } from './messages';
import { createTranslator } from './translate';
import { redirect } from 'next/navigation';

/** Langue de la requête (posée par le middleware dans x-locale ; français par défaut). */
export async function getLocale(): Promise<Locale> {
  try {
    const value = (await headers()).get(LOCALE_HEADER);
    return isLocale(value) ? value : DEFAULT_LOCALE;
  } catch {
    // Hors requête (script, rendu statique) : langue par défaut.
    return DEFAULT_LOCALE;
  }
}

export async function getMessages(locale?: Locale): Promise<Messages> {
  return getMessagesFor(locale ?? (await getLocale()));
}

/** { locale, messages, t, msg, path } pour un composant serveur ou une server action. */
export async function getI18n(forced?: Locale) {
  const locale = forced ?? (await getLocale());
  const messages = getMessagesFor(locale);
  return {
    locale,
    messages,
    t: createTranslator(locale, messages),
    /** Traduit un message serveur français (erreurs de schéma, services). */
    msg: (text: string | undefined | null) => localizeMessage(locale, text),
    /** Lien interne dans la langue de la requête. */
    path: (href: string) => localePath(locale, href),
  };
}

/** redirect() qui conserve la langue de la requête. */
export async function localeRedirect(href: string): Promise<never> {
  redirect(localePath(await getLocale(), href));
}
