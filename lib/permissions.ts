// What each role may do. Every page and route checks this on the server.
import type { Role } from "./users.ts";

export type Action =
  | "submit_profile"
  | "view_own_reviews"
  | "view_all_reviews"
  | "decide_appsec_stage"
  | "decide_model_risk_stage";

const ALLOWED: Record<Role, readonly Action[]> = {
  submitter: ["submit_profile", "view_own_reviews"],
  appsec_reviewer: ["view_all_reviews", "decide_appsec_stage"],
  model_risk_reviewer: ["view_all_reviews", "decide_model_risk_stage"],
  auditor: ["view_all_reviews"],
};

export function can(role: Role, action: Action): boolean {
  return ALLOWED[role].includes(action);
}
