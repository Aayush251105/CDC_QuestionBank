import "next-auth";
import "next-auth/jwt";

// Our User.id travels in the session cookie; nothing else does.
declare module "next-auth" {
  interface Session {
    user: { id: string; name?: string | null; email?: string | null };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    uid?: string;
  }
}
