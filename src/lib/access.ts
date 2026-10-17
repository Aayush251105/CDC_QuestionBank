// Who may sign in (CLAUDE.md sections 2, 2a.7 and 7). Pure so it can be
// tested; src/server/auth.ts feeds it the provider's token claims and env.
//
// Interim (2a.7): Google, verified @snu.edu.in emails only. Microsoft stays
// ready for when SNU IT registers the app; with a tenant id set it also
// checks the token's tenant.

export type AccessConfig = {
  allowedDomains: string[]; // ALLOWED_EMAIL_DOMAINS
  tenantId: string | null; // AUTH_MICROSOFT_ENTRA_ID_TENANT_ID; null = any tenant
  isProduction: boolean;
  allowAnyTenant: boolean; // ALLOW_ANY_MICROSOFT_TENANT, needed in production without a tenant
};

export type SignInAccount =
  | { provider: "google"; email: string | null; emailVerified: boolean }
  | {
      provider: "microsoft-entra-id";
      email: string | null;
      tid: string | null;
    };

export type AccessResult =
  { ok: true } | { ok: false; reason: "wrong-account" | "misconfigured" };

// "snu.edu.in, Example.org " -> ["snu.edu.in", "example.org"]
export function parseDomains(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((d) => d.trim().toLowerCase().replace(/^@/, ""))
    .filter(Boolean);
}

// Exact domain match only: "a@snu.edu.in" yes, "a@mail.snu.edu.in" or "a@snu.edu.in.evil.com" no.
export function isAllowedEmail(email: string, domains: string[]): boolean {
  const at = email.lastIndexOf("@");
  if (at < 1) return false;
  return domains.includes(email.slice(at + 1).toLowerCase());
}

export function checkAccount(
  account: SignInAccount,
  config: AccessConfig,
): AccessResult {
  // Fail closed when the server is not set up safely.
  if (config.allowedDomains.length === 0) {
    return { ok: false, reason: "misconfigured" };
  }

  if (account.provider === "google") {
    // Google must have verified that the person owns the address.
    if (!account.emailVerified) return { ok: false, reason: "wrong-account" };
  } else {
    if (!config.tenantId && config.isProduction && !config.allowAnyTenant) {
      return { ok: false, reason: "misconfigured" };
    }
    if (config.tenantId && account.tid !== config.tenantId) {
      return { ok: false, reason: "wrong-account" };
    }
  }

  if (!account.email || !isAllowedEmail(account.email, config.allowedDomains)) {
    return { ok: false, reason: "wrong-account" };
  }
  return { ok: true };
}
