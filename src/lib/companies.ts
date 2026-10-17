// Filtering and sorting for the Companies page (03). Pure, so it is tested
// on its own; the page reads the options from the URL.

export type CompanySort = "az" | "questions" | "latest";

export type CompanyListItem = {
  id: string;
  name: string;
  slug: string;
  sector: string | null;
  aliases: string[];
  years: number[]; // years with a visible drive
  lastDrive: Date | null; // newest round date
  drives: number;
  questions: number;
};

export type CompanyFilters = {
  q?: string;
  sector?: string;
  year?: number;
  sort?: CompanySort;
};

export function parseCompanyFilters(params: {
  [key: string]: string | string[] | undefined;
}): CompanyFilters {
  const one = (v: string | string[] | undefined) =>
    (Array.isArray(v) ? v[0] : v)?.trim() || undefined;
  const year = Number(one(params.year));
  const sort = one(params.sort);
  return {
    q: one(params.q),
    sector: one(params.sector),
    year: Number.isInteger(year) && year > 2000 ? year : undefined,
    sort: sort === "questions" || sort === "latest" ? sort : "az",
  };
}

export function filterCompanies(
  list: CompanyListItem[],
  { q, sector, year, sort = "az" }: CompanyFilters,
): CompanyListItem[] {
  const needle = q?.toLowerCase();
  const rows = list.filter(
    (c) =>
      (!needle ||
        c.name.toLowerCase().includes(needle) ||
        c.aliases.some((a) => a.toLowerCase().includes(needle))) &&
      (!sector || c.sector === sector) &&
      (!year || c.years.includes(year)),
  );
  const byName = (a: CompanyListItem, b: CompanyListItem) =>
    a.name.localeCompare(b.name, "en", { sensitivity: "base" });
  if (sort === "questions") {
    return rows.sort((a, b) => b.questions - a.questions || byName(a, b));
  }
  if (sort === "latest") {
    const t = (c: CompanyListItem) => c.lastDrive?.getTime() ?? 0;
    return rows.sort((a, b) => t(b) - t(a) || byName(a, b));
  }
  return rows.sort(byName);
}

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

// "Sep 2025" (round dates are stored as UTC midnight)
export function monthYear(date: Date | null): string {
  if (!date) return "–";
  return `${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}
