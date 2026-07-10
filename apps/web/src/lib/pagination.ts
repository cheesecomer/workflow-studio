export function parsePage(value: string | undefined): number {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

export function parseLimit(value: string | undefined): number | undefined {
  const limit = Number(value);
  return Number.isInteger(limit) && limit > 0 ? limit : undefined;
}
