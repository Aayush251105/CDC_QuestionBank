import "server-only";
import { possibleDuplicates } from "@/lib/admin";
import { db } from "@/server/db";

const DEFAULT_SECTORS = [
  "Software",
  "Finance",
  "Consulting",
  "Analytics",
  "Core engineering",
];

// A10: every company (merged ones left out), with drives, live questions
// and a "possible duplicate" flag.
export async function getCompanyAdminList(q: string) {
  const companies = await db.company.findMany({
    where: { mergedIntoId: null },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      sector: true,
      aliases: true,
      hidden: true,
      verified: true,
      _count: { select: { drives: { where: { verified: true } } } },
      drives: {
        where: { verified: true },
        select: {
          rounds: {
            select: {
              _count: {
                select: { questions: { where: { unpublishedAt: null } } },
              },
            },
          },
        },
      },
    },
  });
  const dupes = possibleDuplicates(companies);
  const needle = q.toLowerCase();
  const rows = companies
    .filter(
      (c) =>
        !needle ||
        c.name.toLowerCase().includes(needle) ||
        c.aliases.some((a) => a.toLowerCase().includes(needle)),
    )
    .map((c) => ({
      id: c.id,
      name: c.name,
      sector: c.sector,
      aliases: c.aliases,
      hidden: c.hidden,
      fromRequest: !c.verified,
      drives: c._count.drives,
      questions: c.drives
        .flatMap((d) => d.rounds)
        .reduce((n, r) => n + r._count.questions, 0),
      duplicateOf: dupes.get(c.id) ?? null,
    }));
  const sectors = [
    ...new Set([
      ...DEFAULT_SECTORS,
      ...companies.flatMap((c) => (c.sector ? [c.sector] : [])),
    ]),
  ];
  return {
    rows,
    sectors,
    all: companies.map((c) => ({ id: c.id, name: c.name })),
  };
}
