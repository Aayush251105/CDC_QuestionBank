import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/AdminShell";

export const metadata: Metadata = {
  title: "Admin · Placement Question Bank",
};

// Every /admin page gets the admin shell. Each page still calls
// requireAdmin() itself (CLAUDE.md section 7: layouts alone are not enough).
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return <AdminShell>{children}</AdminShell>;
}
