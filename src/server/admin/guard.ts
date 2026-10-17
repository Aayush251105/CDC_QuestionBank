import "server-only";
import { requireRole } from "@/server/auth";

// Call in every admin page, server action and route handler (the layout
// alone is not enough). Students get the 403 page.
export function requireAdmin() {
  return requireRole("ADMIN", "SUPER_ADMIN");
}

// Admins and settings (A13) only.
export function requireSuperAdmin() {
  return requireRole("SUPER_ADMIN");
}

export const roleLabel = {
  STUDENT: "Student",
  ADMIN: "CDC admin",
  SUPER_ADMIN: "Super admin",
} as const;
