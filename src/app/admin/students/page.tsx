import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { Suspense } from "react";
import { SkeletonRows } from "@/components/Skeleton";
import {
  checkTag,
  Kpi,
  PageHead,
  submissionTag,
  Tag,
  table,
} from "@/components/admin/ui";
import { daysAgo } from "@/lib/admin";
import { fullDate } from "@/lib/labels";
import { requireAdmin } from "@/server/admin/guard";
import { findStudents, getStudent } from "@/server/admin/students";
import { BlockControls } from "./BlockControls";

export const metadata: Metadata = {
  title: "Students · Admin · Placement Question Bank",
};

const intro =
  "Find a student by roll number, name or SNU email. Students appear here after their first sign-in.";

// A11 Students: look up a student, see their submissions, block misuse.
export default function StudentsPage({
  searchParams,
}: PageProps<"/admin/students">) {
  return (
    <>
      <PageHead eyebrow="People" title="Students" intro={intro} />
      <Suspense
        fallback={
          <div className="px-5 pt-6 pb-12 sm:px-8">
            <SkeletonRows rows={6} />
          </div>
        }
      >
        <Students searchParams={searchParams} />
      </Suspense>
    </>
  );
}

const programme = (s: {
  programme: string | null;
  branch: string | null;
  gradYear: number | null;
}) =>
  [[s.programme, s.branch].filter(Boolean).join(" "), s.gradYear]
    .filter(Boolean)
    .join(" · ");

async function Students({
  searchParams,
}: {
  searchParams: PageProps<"/admin/students">["searchParams"];
}) {
  await requireAdmin();
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : "";
  const id = typeof params.id === "string" ? params.id : null;
  const found = id ? { exact: id, matches: [] } : await findStudents(q);
  const student = found.exact ? await getStudent(found.exact) : null;

  return (
    <div className="flex flex-col gap-6 px-5 pt-6 pb-12 sm:px-8">
      <Form
        action="/admin/students"
        role="search"
        className="flex flex-wrap gap-2.5"
      >
        <label htmlFor="s-q" className="sr-only">
          Find a student
        </label>
        <input
          id="s-q"
          name="q"
          type="search"
          defaultValue={q}
          placeholder="Roll number, name or SNU email"
          className="min-h-11 max-w-105 flex-[1_1_280px] border border-line-strong bg-white px-3 text-[15px] focus:border-charcoal focus:shadow-[0_0_0_1px_var(--color-charcoal)] focus:outline-none"
        />
        <button type="submit" className="btn-primary">
          Find
        </button>
      </Form>

      {student ? (
        <section
          aria-labelledby="st-h"
          className="grid items-start gap-8 lg:grid-cols-[minmax(240px,300px)_minmax(0,1fr)]"
        >
          <div className="flex flex-col gap-3 bg-grey-band p-5 text-sm">
            <h2 id="st-h" className="text-xl font-bold">
              {student.name}
            </h2>
            <div>
              <span className="lbl">Roll number</span>
              <div className="font-mono">{student.rollNo ?? "Not given"}</div>
            </div>
            <div>
              <span className="lbl">Email</span>
              <div className="break-all">{student.email}</div>
            </div>
            <div>
              <span className="lbl">Programme</span>
              <div>{programme(student) || "Not given"}</div>
            </div>
            <div>
              <span className="lbl">First sign-in</span>
              <div>{fullDate(student.createdAt)}</div>
            </div>
            <div>
              <span className="lbl">Account</span>
              <div>
                {student.blockedAt ? (
                  <Tag tone="dark">
                    Blocked since {fullDate(student.blockedAt)}
                  </Tag>
                ) : (
                  <Tag tone="good">Active</Tag>
                )}
              </div>
            </div>
            <BlockControls
              userId={student.id}
              name={student.name}
              blocked={Boolean(student.blockedAt)}
              pending={
                student.subs.filter((s) => s.status === "PENDING_REVIEW").length
              }
            />
          </div>

          <div className="flex min-w-0 flex-col gap-5">
            <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-5">
              <Kpi value={student.subs.length} label="Submissions" />
              <Kpi value={student.notFound} label="Not on the shortlist" />
              <Kpi value={student.published} label="Questions published" />
            </div>
            {student.subs.length === 0 ? (
              <p className="text-ink-3">No submissions sent yet.</p>
            ) : (
              <div className={table.wrap}>
                <table className={table.table}>
                  <thead>
                    <tr>
                      <th scope="col" className={table.th}>
                        Drive and round
                      </th>
                      <th scope="col" className={table.th}>
                        PIN
                      </th>
                      <th scope="col" className={table.th}>
                        Shortlist
                      </th>
                      <th scope="col" className={table.th}>
                        Status
                      </th>
                      <th scope="col" className={table.th}>
                        Sent
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {student.subs.map((s) => {
                      const age = daysAgo(s.sent);
                      return (
                        <tr key={s.id} className={table.row}>
                          <td className={table.td}>
                            {s.request ? (
                              <span className="font-bold">{s.drive}</span>
                            ) : (
                              <Link
                                href={`/admin/drives/${s.driveId}/review/${s.id}`}
                                className={table.rowLink}
                              >
                                {s.drive}
                              </Link>
                            )}
                            <div className="text-[13px] text-ink-3">
                              {s.round}
                              {s.request && " · drive request"}
                            </div>
                          </td>
                          <td className={`${table.td} text-sm`}>
                            {s.viaPin
                              ? "Via PIN"
                              : s.olderDrive
                                ? "No PIN (older drive)"
                                : "No PIN"}
                          </td>
                          <td className={table.td}>
                            {s.tag ? (
                              <Tag tone={checkTag[s.tag].tone}>
                                {checkTag[s.tag].label}
                              </Tag>
                            ) : (
                              <Tag tone="draft">Not checked</Tag>
                            )}
                          </td>
                          <td className={table.td}>
                            <Tag tone={submissionTag[s.status].tone}>
                              {submissionTag[s.status].label}
                            </Tag>
                          </td>
                          <td
                            className={`${table.td} text-sm whitespace-nowrap text-ink-3`}
                          >
                            {age.endsWith("days") ? `${age} ago` : age}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      ) : found.matches.length > 0 ? (
        <section aria-labelledby="m-h" className="flex flex-col gap-2.5">
          <h2 id="m-h" className="text-lg font-bold">
            {q
              ? `${found.matches.length} students match "${q}"`
              : "Recently signed in"}
          </h2>
          <div className={table.wrap}>
            <table className={table.table}>
              <thead>
                <tr>
                  <th scope="col" className={table.th}>
                    Student
                  </th>
                  <th scope="col" className={table.th}>
                    Roll number
                  </th>
                  <th scope="col" className={table.th}>
                    Programme
                  </th>
                  <th scope="col" className={table.th}>
                    Account
                  </th>
                </tr>
              </thead>
              <tbody>
                {found.matches.map((m) => (
                  <tr key={m.id} className={table.row}>
                    <td className={table.td}>
                      <Link
                        href={`/admin/students?id=${m.id}`}
                        className={table.rowLink}
                      >
                        {m.name}
                      </Link>
                      <div className="text-[13px] text-ink-3">{m.email}</div>
                    </td>
                    <td className={`${table.td} font-mono text-sm`}>
                      {m.rollNo ?? "–"}
                    </td>
                    <td className={`${table.td} text-sm`}>
                      {programme(m) || "–"}
                    </td>
                    <td className={table.td}>
                      {m.blockedAt ? (
                        <Tag tone="dark">Blocked</Tag>
                      ) : (
                        <Tag tone="good">Active</Tag>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <p className="text-ink-3">
          {q ? `No student matches "${q}".` : "No students have signed in yet."}
        </p>
      )}
    </div>
  );
}
