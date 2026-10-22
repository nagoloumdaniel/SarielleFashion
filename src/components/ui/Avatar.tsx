/* Pastille d'initiale. */
export function Avatar({ name }: { name: string }) {
  const initial = name.trim().charAt(0).toUpperCase() || '?';
  return (
    <span
      aria-hidden="true"
      className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-soft font-heading text-base font-bold text-accent"
    >
      {initial}
    </span>
  );
}
