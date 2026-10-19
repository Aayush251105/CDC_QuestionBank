import Form from "next/form";
import Link from "next/link";
import { Suspense } from "react";
import { ToastProvider } from "@/components/Toast";
import { Wordmark } from "@/components/Wordmark";
import { requireAdmin, roleLabel } from "@/server/admin/guard";
import { countPendingReview } from "@/server/admin/queries";
import { AdminNav } from "./AdminNav";

const stripLink = "text-cream no-underline hover:text-white hover:underline";

// Top strip, header with global search, left sidebar and footer for every
// /admin page (A00a "Navigation"). Each page still checks the role itself.
export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <div className="flex min-h-screen flex-col">
        <a
          href="#main"
          className="sr-only bg-charcoal px-4 py-2 text-white focus:not-sr-only focus:absolute focus:z-50"
        >
          Skip to content
        </a>
        <div className="bg-charcoal text-[13px] text-cream">
          <div className="flex flex-wrap justify-between gap-x-5 gap-y-1.5 px-6 py-2">
            <span>CDC Admin · Shiv Nadar Institution of Eminence</span>
            <span className="flex flex-wrap gap-5">
              <Link href="/" className={stripLink}>
                View student site
              </Link>
              <Link href="/help" className={stripLink}>
                Admin guide
              </Link>
              <Suspense>
                <WhoAmI />
              </Suspense>
            </span>
          </div>
        </div>
        <header className="border-b border-line bg-white">
          <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-3 px-6 py-3">
            <Link href="/admin" className="no-underline">
              <Wordmark title="Placement Question Bank" subtitle="Admin" />
            </Link>
            <Form
              action="/admin/search"
              role="search"
              className="flex flex-[0_1_420px]"
            >
              <label htmlFor="admin-search" className="sr-only">
                Search admin
              </label>
              <input
                id="admin-search"
                name="q"
                type="search"
                placeholder="Search drives, students or questions"
                className="min-h-10.5 w-full border border-line-strong bg-white px-3 text-[15px] focus:border-charcoal focus:shadow-[0_0_0_1px_var(--color-charcoal)] focus:outline-none"
              />
            </Form>
          </div>
        </header>
        <div className="flex flex-auto flex-wrap items-stretch">
          <Suspense
            fallback={<AdminNav reviewCount={null} superAdmin={false} />}
          >
            <Sidebar />
          </Suspense>
          <main id="main" className="flex min-w-0 flex-[999_1_560px] flex-col">
            {children}
            <footer className="mt-auto border-t border-line px-5 py-3.5 text-[13px] text-ink-3 sm:px-8">
              © Career Development Centre, Shiv Nadar IoE · Admin actions are
              recorded in the audit log
            </footer>
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}

async function WhoAmI() {
  const user = await requireAdmin();
  return (
    <span>
      {user.name} · {roleLabel[user.role]}
    </span>
  );
}

async function Sidebar() {
  const user = await requireAdmin();
  const count = await countPendingReview();
  return (
    <AdminNav reviewCount={count} superAdmin={user.role === "SUPER_ADMIN"} />
  );
}
