import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/server/db";
import { visibleQuestion } from "./visibility";

// Topics grouped as on page 08, each with its question count and the two
// companies that ask it most.
export async function getTopicGroups() {
  "use cache";
  cacheLife("minutes");
  cacheTag("questions");

  const tags = await db.tag.findMany({
    orderBy: [{ groupOrder: "asc" }, { name: "asc" }],
    select: {
      name: true,
      slug: true,
      group: true,
      groupOrder: true,
      questions: {
        where: { question: visibleQuestion },
        select: {
          question: {
            select: {
              round: {
                select: {
                  drive: { select: { company: { select: { name: true } } } },
                },
              },
            },
          },
        },
      },
    },
  });

  const groups: {
    name: string;
    order: number;
    topics: { name: string; slug: string; count: number; by: string[] }[];
  }[] = [];
  for (const t of tags) {
    let group = groups.find((g) => g.name === t.group);
    if (!group) {
      group = { name: t.group, order: t.groupOrder, topics: [] };
      groups.push(group);
    }
    const perCompany = new Map<string, number>();
    for (const { question } of t.questions) {
      const name = question.round.drive.company.name;
      perCompany.set(name, (perCompany.get(name) ?? 0) + 1);
    }
    group.topics.push({
      name: t.name,
      slug: t.slug,
      count: t.questions.length,
      by: [...perCompany.entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .slice(0, 2)
        .map(([name]) => name),
    });
  }
  return groups.sort((a, b) => a.order - b.order);
}
