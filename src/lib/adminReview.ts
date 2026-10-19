// Review helpers for A07 and A08. Pure functions.

// "Lowest common ancestor in a BST!" -> "lowest common ancestor in a bst"
export function normaliseTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export type DuplicateItem = {
  title: string;
  roundName: string;
  submissionId: string | null; // null = already published
};

// "Same question, sent by several students": questions with the same
// title in one drive, from at least two submissions or one submission and
// a published question. Matching is by title only, so the reviewer decides.
export function duplicateGroups(items: DuplicateItem[]) {
  const groups = new Map<string, DuplicateItem[]>();
  for (const item of items) {
    const key = normaliseTitle(item.title);
    if (!key) continue;
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  return [...groups.values()]
    .map((list) => {
      const pending = list.filter((i) => i.submissionId);
      const senders = new Set(pending.map((i) => i.submissionId));
      return {
        title: (pending[0] ?? list[0]).title,
        roundName: (pending[0] ?? list[0]).roundName,
        senders: senders.size,
        published: list.length - pending.length,
        firstSubmissionId: pending[0]?.submissionId ?? null,
        key: normaliseTitle(list[0].title),
      };
    })
    .filter((g) => g.senders >= 2 || (g.senders >= 1 && g.published >= 1));
}

// The "Notes" column in A07: things a reviewer should look at.
export function reviewNotes(s: {
  tag: "VERIFIED" | "LIKELY" | "NOT_FOUND" | null;
  roundOrder: number;
  duplicates: number; // other submissions or published questions with the same title
  unclear: number; // "[unclear]" marks in the text
}): string {
  const notes: string[] = [];
  if (s.duplicates > 0) {
    notes.push(
      `Duplicate of ${s.duplicates} other${s.duplicates === 1 ? "" : "s"}`,
    );
  }
  if (s.tag === "NOT_FOUND")
    notes.push(`Not on round ${s.roundOrder} shortlist`);
  if (s.tag === "LIKELY") notes.push("Name match only, confirm");
  if (s.tag === null) notes.push("No shortlist to check against");
  if (s.unclear > 0) {
    notes.push(
      `${s.unclear} ${s.unclear === 1 ? "part" : "parts"} marked [unclear]`,
    );
  }
  return notes.join(" · ") || "None";
}
