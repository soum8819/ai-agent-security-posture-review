// Checks the database connection. Prints only "connected" or a short error
// with no connection details. Run: npm run db:check
import { describeDbError, getSql } from "../lib/db.ts";

try {
  const [row] = await getSql()`SELECT 1 AS ok`;
  if (row?.ok !== 1) throw new Error("unexpected reply");
  console.log("connected");
} catch (error) {
  console.error(`not connected: ${describeDbError(error)}`);
  process.exit(1);
}
