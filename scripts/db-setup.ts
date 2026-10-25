// Creates the tables in db/schema.sql, then lists what exists. Prints table
// and trigger names only, never connection details. Run: npm run db:setup
import { readFileSync } from "node:fs";
import { describeDbError, getSql } from "../lib/db.ts";

// Split the file into statements on ";" at line ends, keeping $$ function
// bodies whole.
function statements(text: string) {
  const out: string[] = [];
  let current = "";
  let inBody = false;
  for (const line of text.split("\n")) {
    if (line.trim().startsWith("--") && !inBody) continue;
    current += line + "\n";
    if ((line.match(/\$\$/g) ?? []).length % 2 === 1) inBody = !inBody;
    if (!inBody && line.trimEnd().endsWith(";")) {
      out.push(current.trim());
      current = "";
    }
  }
  if (current.trim()) out.push(current.trim());
  return out;
}

try {
  const sql = getSql();
  const list = statements(readFileSync("db/schema.sql", "utf8"));
  for (const s of list) await sql.query(s);
  console.log(`ran ${list.length} statements`);

  const tables = await sql`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' ORDER BY table_name`;
  console.log("tables:", tables.map((t) => t.table_name).join(", "));
  const triggers = await sql`
    SELECT DISTINCT trigger_name FROM information_schema.triggers
    WHERE event_object_table = 'audit_events' ORDER BY trigger_name`;
  const truncate = await sql`
    SELECT tgname FROM pg_trigger WHERE tgrelid = 'audit_events'::regclass AND NOT tgisinternal ORDER BY tgname`;
  console.log("audit_events triggers:", truncate.map((t) => t.tgname).join(", ") || triggers.map((t) => t.trigger_name).join(", "));
} catch (error) {
  console.error(`setup failed: ${describeDbError(error)}`);
  process.exit(1);
}
