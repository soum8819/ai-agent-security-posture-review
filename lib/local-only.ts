// Spike guard: these routes run only under `npm run dev` on this computer.
// Returns a 404 response on every Vercel deployment and in production mode.
export function localOnly(): Response | null {
  if (process.env.VERCEL || process.env.NODE_ENV !== "development") {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  return null;
}
