"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  createSessionToken,
  passcodeMatches,
  sessionSecret,
} from "@/lib/session";
import { findUser } from "@/lib/users";

// Only paths inside the reviewer app, so the sign-in page cannot be used to
// send someone to another site.
function safeNext(value: FormDataEntryValue | null) {
  const next = typeof value === "string" ? value : "";
  return /^\/app(\/[A-Za-z0-9\-_/]*)?$/.test(next) && next !== "/app/sign-in" ? next : "/app";
}

export async function signIn(formData: FormData) {
  const secret = sessionSecret();
  const expectedPasscode = process.env.DEMO_PASSCODE;
  if (!secret || !expectedPasscode) redirect("/app/sign-in?error=setup");

  const user = findUser(String(formData.get("userId") ?? ""));
  const passcode = String(formData.get("passcode") ?? "");
  // One message for every failure, so the page does not reveal which part was wrong.
  if (!user || !(await passcodeMatches(passcode, expectedPasscode))) {
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
