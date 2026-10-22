'use client';

import { useEffect, useState } from 'react';

/* Rendu serveur en Africa/Dakar (UTC+0, sans heure d'été), puis fuseau de l'appareil après
   montage : évite tout écart d'hydratation quand le serveur n'est pas dans le fuseau du navigateur. */
function useDeviceZone(): string {
  const [zone, setZone] = useState('Africa/Dakar');
  useEffect(() => {
    setZone(Intl.DateTimeFormat().resolvedOptions().timeZone || 'Africa/Dakar');
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
  const timeZone = useDeviceZone();
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return <span className={className}>Date inconnue</span>;
  const formatted = new Intl.DateTimeFormat('fr-FR', { dateStyle, timeStyle, timeZone }).format(
    date,
  );
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
  const timeZone = useDeviceZone();
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return <span className={className}>Date inconnue</span>;
  const formatted = new Intl.DateTimeFormat('fr-FR', { dateStyle, timeZone }).format(date);
  return (
    <time dateTime={iso} className={className}>
      {formatted}
    </time>
  );
}
