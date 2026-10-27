import type { Locale } from '../config';
import { de } from './de';
import { fr } from './fr';
import type { Messages } from './types';

export type { Messages };
export const MESSAGES: Record<Locale, Messages> = { fr, de };
export function getMessagesFor(locale: Locale): Messages {
  return MESSAGES[locale];
}
