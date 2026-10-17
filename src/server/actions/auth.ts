"use server";

import { signIn, signInOptions, signOut } from "@/server/auth";

export async function signInWithGoogle() {
  if (!signInOptions.google) return;
  await signIn("google", { redirectTo: "/" });
}

export async function signInWithMicrosoft() {
  if (!signInOptions.microsoft) return;
  await signIn("microsoft-entra-id", { redirectTo: "/" });
}

// Dev only: sign in as a seeded user picked from the list.
export async function devSignIn(formData: FormData) {
  if (!signInOptions.devLogin) return;
  await signIn("dev-login", {
    email: String(formData.get("email") ?? ""),
    redirectTo: "/",
  });
}

export async function signOutAction() {
  await signOut({ redirectTo: "/login" });
}
