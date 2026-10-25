"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { describeDbError } from "@/lib/db";
import { SIGN_IN_WINDOW_MS, signInAllowed } from "@/lib/limits";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  createSessionToken,
  networkCode,
  passcodeMatches,
  sessionSecret,
} from "@/lib/session";
import { countRecentSignInFailures, recordAuditEvent } from "@/lib/store";
import { findUser } from "@/lib/users";

// Only paths inside the reviewer app, so the sign-in page cannot be used to
// send someone to another site.
function safeNext(value: FormDataEntryValue | null) {
  const next = typeof value === "string" ? value : "";
  return /^\/app(\/[A-Za-z0-9\-_/]*)?$/.test(next) && next !== "/app/sign-in" ? next : "/app";
}

// The visitor's network address as Vercel reports it. Only ever stored as a
// one-way code (networkCode), never as the address itself.
async function networkAddress() {
  const h = await headers();
  return h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

export async function signIn(formData: FormData) {
  const secret = sessionSecret();
  const expectedPasscode = process.env.DEMO_PASSCODE;
  if (!secret || !expectedPasscode) redirect("/app/sign-in?error=setup");

  // Sign-in attempt limit: checked before the passcode, so a locked-out
  // address cannot keep guessing.
  const network = await networkCode(await networkAddress(), secret);
  let failures = 0;
  try {
    failures = await countRecentSignInFailures(network, SIGN_IN_WINDOW_MS);
  } catch (error) {
    console.error("[sign-in] could not check the attempt limit:", describeDbError(error));
    redirect("/app/sign-in?error=unavailable");
  }
  if (!signInAllowed(failures)) {
    await recordAuditEvent(null, null, "sign_in_blocked", { network }).catch(() => {});
    redirect("/app/sign-in?error=locked");
  }

  const user = findUser(String(formData.get("userId") ?? ""));
  const passcode = String(formData.get("passcode") ?? "");
  // One message for every failure, so the page does not reveal which part was wrong.
  if (!user || !(await passcodeMatches(passcode, expectedPasscode))) {
    await recordAuditEvent(null, null, "sign_in_failed", { network, chosenUser: user?.id ?? "unknown" }).catch((e) =>
      console.error("[sign-in] could not record the failure:", describeDbError(e)),
    );
    redirect("/app/sign-in?error=invalid");
  }

  (await cookies()).set(SESSION_COOKIE, await createSessionToken(user.id, secret), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  redirect(safeNext(formData.get("next")));
}

export async function signOut() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/app/sign-in");
}
