// The Neon Postgres connection. Created on first use, never at import time,
// so `next build` works even where DATABASE_URL is not set.
// Never log DATABASE_URL or include it in an error message.
import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

let sql: NeonQueryFunction<false, false> | null = null;

export function getSql() {
  if (!sql) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    sql = neon(url);
  }
  return sql;
}

// Which copy of the app wrote a row: this computer or a Vercel deployment.
// Both share one database, so every row records it.
export function appEnvironment(): "local" | "preview" | "production" {
  const env = process.env.VERCEL_ENV;
  return env === "production" || env === "preview" ? env : "local";
}

// A safe one-line description of a database error: its kind and code only,
// never the connection string, host or user name.
export function describeDbError(error: unknown) {
  if (error && typeof error === "object") {
    const e = error as { name?: string; code?: string };
    return [e.name ?? "Error", e.code].filter(Boolean).join(" ");
  }
  return "Error";
}
