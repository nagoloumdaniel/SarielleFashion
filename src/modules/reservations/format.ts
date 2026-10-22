/* Formats euro (EUR) : les colonnes *Cents sont en centimes, sans décimales à l'affichage. */
const euro = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

export function formatEuro(cents: number): string {
  return euro.format(Math.round(cents / 100));
}

export function formatEuroOrPending(cents: number | null): string {
  return cents == null ? 'Prix à confirmer' : formatEuro(cents);
}

/** « 1 h 30 » / « 45 min ». */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, '0')}`;
}
