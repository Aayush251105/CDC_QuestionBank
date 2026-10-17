import { ToastProvider } from "@/components/Toast";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";

// Header, main and footer for every student page, and for the 404 / 403 pages.
export function SiteShell({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        <main id="main" className="flex flex-auto flex-col">
          {children}
        </main>
        <SiteFooter />
      </div>
    </ToastProvider>
  );
}
