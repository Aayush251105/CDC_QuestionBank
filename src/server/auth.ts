import "server-only";
import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import { forbidden, redirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";
import { type Role } from "@/generated/prisma/client";
import { checkAccount, parseDomains, type SignInAccount } from "@/lib/access";
import { db } from "./db";

// ---------- Which sign-in options exist ----------
// Google is the interim provider (CLAUDE.md 2a.7). Microsoft turns on when
// its keys are in .env. The dev login exists only under `pnpm dev` with
// DEV_LOGIN=true; `next build` sets NODE_ENV=production, so it can never be
// part of a production build.

const tenantId = process.env.AUTH_MICROSOFT_ENTRA_ID_TENANT_ID || null;

export const signInOptions = {
  google: Boolean(process.env.AUTH_GOOGLE_ID),
  microsoft: Boolean(process.env.AUTH_MICROSOFT_ENTRA_ID_ID),
  devLogin:
    process.env.NODE_ENV === "development" && process.env.DEV_LOGIN === "true",
};

const providers: NextAuthConfig["providers"] = [];

if (signInOptions.google) {
  providers.push(
    Google({ authorization: { params: { prompt: "select_account" } } }),
  );
}

if (signInOptions.microsoft) {
  providers.push(
    MicrosoftEntraID({
      // No tenant yet: Microsoft's "common" endpoint (any account), and the
      // email check below does the filtering. With a tenant: SNU only.
      issuer: tenantId
        ? `https://login.microsoftonline.com/${tenantId}/v2.0`
        : undefined,
      authorization: {
        params: { scope: "openid profile email", prompt: "select_account" },
      },
      // Skip the provider's default profile photo download.
      profile: (p) => ({
        id: p.sub,
        name: p.name,
        email: p.email ?? p.preferred_username,
      }),
    }),
  );
}

if (signInOptions.devLogin) {
  providers.push(
    Credentials({
      id: "dev-login",
      name: "Dev login",
      credentials: { email: {} },
      async authorize(credentials) {
        if (!signInOptions.devLogin) return null;
        const email = String(credentials?.email ?? "");
        const user = await db.user.findUnique({ where: { email } });
        return user
          ? { id: user.id, name: user.name, email: user.email }
          : null;
      },
    }),
  );
}

// ---------- Auth.js ----------

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  session: { strategy: "jwt" },
  pages: { signIn: "/login", error: "/login" },
  callbacks: {
    // Runs on the server for every sign-in. Returning a URL sends the
    // browser there instead of finishing the sign-in.
    async signIn({ account, profile }) {
      if (account?.provider === "dev-login") return signInOptions.devLogin;

      let claims: SignInAccount;
      if (account?.provider === "google") {
        claims = {
          provider: "google",
          email: profile?.email ?? null,
          emailVerified: profile?.email_verified === true,
        };
      } else if (account?.provider === "microsoft-entra-id") {
        claims = {
          provider: "microsoft-entra-id",
          email:
            (profile?.email as string | undefined) ??
            (profile?.preferred_username as string | undefined) ??
            null,
          tid: (profile?.tid as string | undefined) ?? null,
        };
      } else {
        return false;
      }

      const result = checkAccount(claims, {
        allowedDomains: parseDomains(process.env.ALLOWED_EMAIL_DOMAINS),
        tenantId,
        isProduction: process.env.NODE_ENV === "production",
        allowAnyTenant: process.env.ALLOW_ANY_MICROSOFT_TENANT === "true",
      });
      if (result.ok) return true;
      if (result.reason === "misconfigured") {
        console.error(
          "Sign-in refused: check ALLOWED_EMAIL_DOMAINS and the Microsoft tenant settings.",
        );
        return "/login?state=error";
      }
      return "/login?state=wrong-account";
    },

    // On first sign-in, create or find our own User row and keep only its id
    // in the session cookie. Role and details are always read from the DB.
    async jwt({ token, user, account, profile }) {
      if (!account) return token;

      if (account.provider === "dev-login") {
        token.uid = user.id;
        return token;
      }

      const email = (user.email ?? "").toLowerCase();
      const entraOid =
        account.provider === "microsoft-entra-id"
          ? ((profile?.oid as string | undefined) ?? null)
          : null;
      const dbUser = await db.user.upsert({
        where: { email },
        create: { email, name: user.name ?? email, entraOid },
        update: entraOid ? { entraOid } : {},
      });
      token.uid = dbUser.id;
      return token;
    },

    session({ session, token }) {
      if (token.uid) session.user.id = token.uid;
      return session;
    },
  },
});

// ---------- Guards: call these in every page, server action and route handler ----------

const userFields = {
  id: true,
  email: true,
  name: true,
  role: true,
  rollNo: true,
  programme: true,
  branch: true,
  gradYear: true,
  creditByDefault: true,
} as const;

// The signed-in user, or null. Cached for the length of one request.
export const getCurrentUser = cache(async () => {
  // Session checks always run per request, never at prerender time.
  await connection();
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;
  return db.user.findUnique({ where: { id }, select: userFields });
});

// Sends signed-out visitors to /login.
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

// Shows the 403 page when the user lacks the role.
export async function requireRole(...roles: Role[]) {
  const user = await requireUser();
  if (!roles.includes(user.role)) forbidden();
  return user;
}
