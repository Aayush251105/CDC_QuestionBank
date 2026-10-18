import "next-auth";
import "next-auth/jwt";

// Our User.id and the sign-in method travel in the session cookie; nothing
// else does (role and details are always read from the database).
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      provider?: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    uid?: string;
    provider?: string;
  }
}
