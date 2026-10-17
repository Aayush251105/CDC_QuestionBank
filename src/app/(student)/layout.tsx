import { SiteShell } from "@/components/site/SiteShell";

// Every student page gets the header and footer. Each page still calls
// requireUser() itself (CLAUDE.md section 7: layouts alone are not enough).
export default function StudentLayout({ children }: LayoutProps<"/">) {
  return <SiteShell>{children}</SiteShell>;
}
