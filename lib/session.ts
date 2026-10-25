// Signed session cookie: the user id and an expiry, signed with SESSION_SECRET
// (HMAC SHA-256). Uses the built-in Web Crypto API, so it runs in the proxy,
// pages, routes and tests alike. Without a valid secret, nobody is signed in.
import { findUser, type User } from "./users.ts";

export const SESSION_COOKIE = "hl_session";
export const SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;
const MIN_SECRET_LENGTH = 32;

const enc = new TextEncoder();

function toBase64Url(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(text: string) {
  const b64 = text.replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4)), (c) => c.charCodeAt(0));
}

async function hmacKey(secret: string) {
  return crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
    "verify",
  ]);
}

export function sessionSecret(): string | null {
  const s = process.env.SESSION_SECRET;
  return s && s.length >= MIN_SECRET_LENGTH ? s : null;
}

export async function createSessionToken(userId: string, secret: string, now = Date.now()) {
  const payload = toBase64Url(enc.encode(JSON.stringify({ u: userId, exp: now + SESSION_MAX_AGE_SECONDS * 1000 })));
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", await hmacKey(secret), enc.encode(payload)));
  return `${payload}.${toBase64Url(sig)}`;
}

// Returns the signed-in user, or null if the token is missing, altered,
// signed with another secret, expired, or names an unknown user.
export async function verifySessionToken(token: string, secret: string, now = Date.now()): Promise<User | null> {
  const [payload, sig, extra] = token.split(".");
  if (!payload || !sig || extra !== undefined) return null;
  try {
    const ok = await crypto.subtle.verify("HMAC", await hmacKey(secret), fromBase64Url(sig), enc.encode(payload));
    if (!ok) return null;
    const data = JSON.parse(new TextDecoder().decode(fromBase64Url(payload)));
    if (typeof data.u !== "string" || typeof data.exp !== "number" || data.exp <= now) return null;
    return findUser(data.u) ?? null;
  } catch {
    return null;
  }
}

// Compares a typed passcode with the expected one without leaking, through
// timing, how much of it was right.
export async function passcodeMatches(input: string, expected: string) {
  const key = await crypto.subtle.generateKey({ name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
  const expectedSig = await crypto.subtle.sign("HMAC", key, enc.encode(expected));
  return crypto.subtle.verify("HMAC", key, expectedSig, enc.encode(input));
}

// A one-way code for a network address, so the audit log can count failed
// sign-ins per address without ever storing the address itself. Mixed with
// the session secret, so the code cannot be matched to an address elsewhere.
export async function networkCode(address: string, secret: string) {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(`${secret}|network|${address}`)));
  return Array.from(digest.slice(0, 12), (b) => b.toString(16).padStart(2, "0")).join("");
}
