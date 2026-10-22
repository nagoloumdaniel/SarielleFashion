'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { DEFAULT_LOCALE, localePath, type Locale } from './config';
import { localizeMessage } from './server-messages';
import type { Messages } from './messages';
import { createTranslator } from './translate';

/* Contexte de langue côté client. Le layout racine fournit la langue et les espaces de noms
   communs ; une page qui rend un composant client lourd ajoute le sien avec <I18nScope>. */
type PartialMessages = Partial<Messages>;
type Ctx = { locale: Locale; messages: PartialMessages };

const I18nContext = createContext<Ctx>({ locale: DEFAULT_LOCALE, messages: {} });

export function LocaleProvider({
  locale,
  messages,
  children,
}: {
  locale: Locale;
  messages: PartialMessages;
  children: ReactNode;
}) {
  const value = useMemo(() => ({ locale, messages }), [locale, messages]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/** Ajoute des espaces de noms (ex. { booking }) au contexte courant. */
export function I18nScope({
  messages,
  children,
}: {
  messages: PartialMessages;
  children: ReactNode;
}) {
  const parent = useContext(I18nContext);
  const value = useMemo(
    () => ({ locale: parent.locale, messages: { ...parent.messages, ...messages } }),
    [parent, messages],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useLocale(): Locale {
  return useContext(I18nContext).locale;
}

/** { locale, messages, t, msg, path } pour un composant client. */
export function useI18n() {
  const { locale, messages } = useContext(I18nContext);
  return useMemo(
    () => ({
      locale,
      messages: messages as Messages,
      t: createTranslator(locale, messages as Messages),
      msg: (text: string | undefined | null) => localizeMessage(locale, text),
      path: (href: string) => localePath(locale, href),
    }),
    [locale, messages],
  );
}

export function useT() {
  return useI18n().t;
}
