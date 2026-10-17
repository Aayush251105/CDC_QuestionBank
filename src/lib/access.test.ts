import { describe, expect, it } from "vitest";
import {
  type AccessConfig,
  checkAccount,
  isAllowedEmail,
  parseDomains,
} from "./access";

const SNU_TID = "11111111-2222-3333-4444-555555555555";
const OTHER_TID = "99999999-8888-7777-6666-555555555555";

const config: AccessConfig = {
  allowedDomains: ["snu.edu.in"],
  tenantId: null,
  isProduction: false,
  allowAnyTenant: false,
};

const google = (email: string | null, emailVerified = true) =>
  ({ provider: "google", email, emailVerified }) as const;
const microsoft = (email: string | null, tid: string | null) =>
  ({ provider: "microsoft-entra-id", email, tid }) as const;

describe("parseDomains", () => {
  it("splits, trims and lower-cases", () => {
    expect(parseDomains(" snu.edu.in, @Example.ORG ,")).toEqual([
      "snu.edu.in",
      "example.org",
    ]);
    expect(parseDomains(undefined)).toEqual([]);
  });
});

describe("isAllowedEmail", () => {
  it("matches the exact domain only", () => {
    expect(isAllowedEmail("as123@snu.edu.in", ["snu.edu.in"])).toBe(true);
    expect(isAllowedEmail("AS123@SNU.EDU.IN", ["snu.edu.in"])).toBe(true);
    expect(isAllowedEmail("a@mail.snu.edu.in", ["snu.edu.in"])).toBe(false);
    expect(isAllowedEmail("a@snu.edu.in.evil.com", ["snu.edu.in"])).toBe(false);
    expect(isAllowedEmail("someone@gmail.com", ["snu.edu.in"])).toBe(false);
    expect(isAllowedEmail("snu.edu.in", ["snu.edu.in"])).toBe(false);
  });
});

describe("Google (interim)", () => {
  it("lets in verified snu.edu.in emails", () => {
    expect(checkAccount(google("as123@snu.edu.in"), config)).toEqual({
      ok: true,
    });
    expect(
      checkAccount(google("as123@snu.edu.in"), {
        ...config,
        isProduction: true,
      }),
    ).toEqual({ ok: true });
  });

  it("turns away unverified addresses and other domains", () => {
    expect(checkAccount(google("as123@snu.edu.in", false), config)).toEqual({
      ok: false,
      reason: "wrong-account",
    });
    expect(checkAccount(google("me@gmail.com"), config).ok).toBe(false);
    expect(checkAccount(google(null), config).ok).toBe(false);
  });
});

describe("Microsoft without a tenant", () => {
  it("lets in snu.edu.in emails from any tenant in development", () => {
    expect(
      checkAccount(microsoft("as123@snu.edu.in", OTHER_TID), config),
    ).toEqual({
      ok: true,
    });
    expect(
      checkAccount(microsoft("me@outlook.com", OTHER_TID), config).ok,
    ).toBe(false);
  });

  it("refuses everyone in production unless any-tenant is allowed on purpose", () => {
    const prod = { ...config, isProduction: true };
    const account = microsoft("as123@snu.edu.in", OTHER_TID);
    expect(checkAccount(account, prod)).toEqual({
      ok: false,
      reason: "misconfigured",
    });
    expect(checkAccount(account, { ...prod, allowAnyTenant: true })).toEqual({
      ok: true,
    });
  });
});

describe("Microsoft with the SNU tenant (after IT approval)", () => {
  const snu = { ...config, tenantId: SNU_TID, isProduction: true };

  it("needs both the SNU tenant and an snu.edu.in email", () => {
    expect(checkAccount(microsoft("as123@snu.edu.in", SNU_TID), snu)).toEqual({
      ok: true,
    });
    expect(checkAccount(microsoft("as123@snu.edu.in", OTHER_TID), snu).ok).toBe(
      false,
    );
    expect(checkAccount(microsoft("me@outlook.com", SNU_TID), snu).ok).toBe(
      false,
    );
  });
});

describe("misconfiguration", () => {
  it("refuses everyone when no email domain is configured", () => {
    const empty = { ...config, allowedDomains: [] };
    expect(checkAccount(google("as123@snu.edu.in"), empty)).toEqual({
      ok: false,
      reason: "misconfigured",
    });
  });
});
