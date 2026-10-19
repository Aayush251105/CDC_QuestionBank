import type { Metadata } from "next";
import { Suspense } from "react";
import { SkeletonRows } from "@/components/Skeleton";
import { PageHead, SrOnly, table } from "@/components/admin/ui";
import { daysAgo } from "@/lib/admin";
import { parseDomains } from "@/lib/access";
import { requireSuperAdmin, roleLabel } from "@/server/admin/guard";
import { getAdmins, getSettings } from "@/server/admin/settings";
import { AddAdmin, AdminActions, SettingsForm } from "./SettingsControls";

export const metadata: Metadata = {
  title: "Admins and settings · Admin · Placement Question Bank",
};

const intro =
  "Only super admins can see this page. Every change here is recorded in the audit log.";

const h2 = "border-b-2 border-charcoal pb-2 text-xl font-bold";

// A13 Admins and settings (super admin only). Sign-in settings stay in env
// and are shown read-only; there are no email templates (CLAUDE.md 2a.2).
export default function SettingsPage() {
  return (
    <>
      <PageHead
        eyebrow="Super admin"
        title="Admins and settings"
        intro={intro}
      />
      <Suspense
        fallback={
          <div className="px-5 pt-7 pb-12 sm:px-8">
            <SkeletonRows rows={6} />
          </div>
        }
      >
        <Settings />
      </Suspense>
    </>
  );
}

async function Settings() {
  const me = await requireSuperAdmin();
  const [admins, settings] = await Promise.all([getAdmins(), getSettings()]);
  const domains = parseDomains(process.env.ALLOWED_EMAIL_DOMAINS);
  const tenant = process.env.AUTH_MICROSOFT_ENTRA_ID_TENANT_ID;

  return (
    <div className="flex max-w-245 flex-col gap-10 px-5 pt-7 pb-12 sm:px-8">
      <section aria-labelledby="ad-h" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b-2 border-charcoal pb-2">
          <h2 id="ad-h" className="text-xl font-bold">
            Admins
          </h2>
          <AddAdmin domain={domains[0] ?? "snu.edu.in"} />
        </div>
        <div className={table.wrap}>
          <table className={table.table}>
            <thead>
              <tr>
                <th scope="col" className={table.th}>
                  Name
                </th>
                <th scope="col" className={table.th}>
                  Role
                </th>
                <th scope="col" className={table.th}>
                  Last active
                </th>
                <th scope="col" className={table.th}>
                  <SrOnly>Actions</SrOnly>
                </th>
              </tr>
            </thead>
            <tbody>
              {admins.map((a) => {
                const age = a.lastActive ? daysAgo(a.lastActive) : null;
                return (
                  <tr key={a.id} className={table.row}>
                    <td className={`${table.td} font-bold`}>
                      {a.name}
                      <div className="text-[13px] font-normal text-ink-3">
                        {a.email}
                      </div>
                    </td>
                    <td className={`${table.td} text-sm`}>
                      {roleLabel[a.role as "ADMIN" | "SUPER_ADMIN"]}
                    </td>
                    <td className={`${table.td} text-sm text-ink-3`}>
                      {age === null
                        ? "No admin actions yet"
                        : age.endsWith("days")
                          ? `${age} ago`
                          : age}
                    </td>
                    <td className={`${table.td} text-right whitespace-nowrap`}>
                      <AdminActions
                        userId={a.id}
                        name={a.name}
                        role={a.role as "ADMIN" | "SUPER_ADMIN"}
                        isMe={a.id === me.id}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="si-h" className="flex flex-col gap-3.5">
        <h2 id="si-h" className={h2}>
          Sign-in
        </h2>
        <dl className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <dt className="lbl">Microsoft tenant</dt>
            <dd className="font-mono text-sm">{tenant || "Not set yet"}</dd>
          </div>
          <div className="flex flex-col gap-1.5">
            <dt className="lbl">Allowed email domain</dt>
            <dd>{domains.join(", ") || "None: nobody can sign in"}</dd>
          </div>
        </dl>
        <p className="text-sm text-ink-3">
          These come from the server settings (.env) and change with a new
          deploy, so a mistake here can never lock everyone out.
        </p>
      </section>

      <section aria-labelledby="pd-h" className="flex flex-col">
        <h2 id="pd-h" className={`${h2} mb-1.5`}>
          Defaults and switches
        </h2>
        <SettingsForm settings={settings} />
      </section>

      <section className="flex flex-col gap-3 bg-grey-band p-5">
        <span className="max-w-140 text-[15px]">
          <strong>Export all data</strong> as CSV for CDC records: drives,
          questions, submissions and the audit log. Shortlists are left out.
        </span>
        <span className="flex flex-wrap gap-2.5">
          {(["drives", "questions", "submissions", "audit"] as const).map(
            (t) => (
              <a
                key={t}
                href={`/admin/settings/export/${t}`}
                className="btn-secondary min-h-9 px-3"
              >
                {t === "audit" ? "Audit log" : t[0].toUpperCase() + t.slice(1)}
              </a>
            ),
          )}
        </span>
      </section>
    </div>
  );
}
