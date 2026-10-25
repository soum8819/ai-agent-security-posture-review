// Server-side sign-in checks for pages, server actions and routes.
// The proxy checks too; this second check means no page relies on it alone.
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { can, type Action } from "./permissions.ts";
import { SESSION_COOKIE, sessionSecret, verifySessionToken } from "./session.ts";
import type { User } from "./users.ts";

export async function currentUser(): Promise<User | null> {
  const secret = sessionSecret();
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!secret || !token) return null;
  return verifySessionToken(token, secret);
}

// Sends the visitor to sign-in if not signed in, and to the not-allowed page
// if their role may not do this.
export async function requireUser(action?: Action): Promise<User> {
  const user = await currentUser();
  if (!user) redirect("/app/sign-in");
  if (action && !can(user.role, action)) redirect("/app/not-allowed");
  return user;
}
