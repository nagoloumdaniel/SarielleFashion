'use client';

import { useEffect, useState } from 'react';
import { useI18n } from '@/i18n/client';
import { INTL_LOCALE } from '@/i18n/config';

/* Rendu serveur en Europe/Berlin (heure d'été gérée par Intl), puis fuseau de l'appareil après
   montage : évite tout écart d'hydratation quand le serveur n'est pas dans le fuseau du navigateur. */
function useDeviceZone(): string {
  const [zone, setZone] = useState('Europe/Berlin');
  useEffect(() => {
    setZone(Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Berlin');
  }, []);
  return zone;
}

/* Affichage d'un instant UTC dans le fuseau de l'appareil (P1.5). */
export function LocalDateTime({
  iso,
  dateStyle = 'full',
  timeStyle = 'short',
  className = '',
}: {
  iso: string;
  dateStyle?: 'full' | 'long' | 'medium' | 'short';
  timeStyle?: 'full' | 'long' | 'medium' | 'short';
  className?: string;
}) {
  const { t, locale } = useI18n();
  const timeZone = useDeviceZone();
  const date = new Date(iso);
  if (Number.isNaN(date.getTime()))
    return <span className={className}>{t('common.ui.unknownDate')}</span>;
  const formatted = new Intl.DateTimeFormat(INTL_LOCALE[locale], {
    dateStyle,
    timeStyle,
    timeZone,
  }).format(date);
  return (
    <time dateTime={iso} className={className}>
      {formatted}
    </time>
  );
}

export function LocalDate({
  iso,
  dateStyle = 'full',
  className = '',
}: {
  iso: string;
  dateStyle?: 'full' | 'long' | 'medium' | 'short';
  className?: string;
}) {
  const { t, locale } = useI18n();
  const timeZone = useDeviceZone();
  const date = new Date(iso);
  if (Number.isNaN(date.getTime()))
    return <span className={className}>{t('common.ui.unknownDate')}</span>;
  const formatted = new Intl.DateTimeFormat(INTL_LOCALE[locale], { dateStyle, timeZone }).format(
    date,
  );
  return (
    <time dateTime={iso} className={className}>
      {formatted}
    </time>
  );
}
