/* Pagination serveur commune (?page=N) : page lue depuis l'URL, bornée au nombre de pages réel. */
export function parsePage(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const page = Number.parseInt(raw ?? '', 10);
  return Number.isFinite(page) && page > 0 ? page : 1;
}

export function paginate(total: number, requestedPage: number, pageSize: number) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(1, requestedPage), totalPages);
  return { page, totalPages, skip: (page - 1) * pageSize, take: pageSize };
}
