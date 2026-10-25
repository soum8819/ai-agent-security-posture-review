// Four fictional users, one per role. Stand-in for Harborline's corporate
// sign-in: production would take users and roles from OIDC or SAML.
export const ROLES = ["submitter", "appsec_reviewer", "model_risk_reviewer", "auditor"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  submitter: "Submitter",
  appsec_reviewer: "AppSec Reviewer",
  model_risk_reviewer: "Model Risk Reviewer",
  auditor: "Auditor (read-only)",
};

export type User = { id: string; name: string; role: Role; team: string };

export const USERS: readonly User[] = [
  { id: "u-submitter", name: "Riley Chen", role: "submitter", team: "Claims Operations" },
  { id: "u-appsec", name: "Alex Moreno", role: "appsec_reviewer", team: "Application Security" },
  { id: "u-modelrisk", name: "Priya Nair", role: "model_risk_reviewer", team: "Model Risk Management" },
  { id: "u-auditor", name: "Jordan Lee", role: "auditor", team: "Internal Audit" },
];

export function findUser(id: string): User | undefined {
  return USERS.find((u) => u.id === id);
}
