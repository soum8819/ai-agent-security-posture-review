// JSON export of the audit log, for the Auditor only. Same permission check
// as the audit page. Optional ?review=<id or first characters>.
import { AUDIT_EXPORT_LIMIT, parseReviewFilter } from "@/lib/audit-view";
import { currentUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { listAuditEvents } from "@/lib/store";

export async function GET(request: Request) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "Sign in required" }, { status: 401 });
  if (!can(user.role, "view_audit_log")) return Response.json({ error: "Not allowed" }, { status: 403 });

  const raw = new URL(request.url).searchParams.get("review");
  const filter = parseReviewFilter(raw);
  if (raw && raw.trim() !== "" && !filter) return Response.json({ error: "Invalid review id" }, { status: 400 });

  const events = await listAuditEvents(filter, AUDIT_EXPORT_LIMIT);
  const exportedAt = new Date().toISOString();
  const body = JSON.stringify({ exportedAt, exportedBy: user.id, reviewFilter: filter, count: events.length, events }, null, 2);
  return new Response(body, {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="audit-log${filter ? `-${filter.slice(0, 8)}` : ""}-${exportedAt.slice(0, 10)}.json"`,
      "cache-control": "no-store",
    },
  });
}
