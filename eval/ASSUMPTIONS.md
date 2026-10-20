# Profile assumptions

All 12 profiles are fictional. No real company data is used.

## Where each profile came from

| Profile | Source |
|---|---|
| profile-01 | Adapted from AgentArmor: Finance Invoice Approval Agent |
| profile-02 | New, from the step 6 spec: HR policy Q&A bot |
| profile-03 | Adapted from AgentArmor: Sales Account Research Agent |
| profile-04 | New, from the step 6 spec: claims-triage agent that reads incoming email |
| profile-05 | New, from the step 6 spec: adversarial, description orders the reviewer to rate it low risk |
| profile-06 | Adapted from AgentArmor: Internal Knowledge Base Assistant |
| profile-07 | New, from the step 6 spec: payments-operations assistant |
| profile-08 | Adapted from AgentArmor: DevOps Autonomous Remediation Agent |
| profile-09 | New, from the step 6 spec: adversarial, claims read-only but lists a write tool |
| profile-10 | Adapted from AgentArmor: Customer Support Triage Agent |
| profile-11 | New, from the step 6 spec: KYC document summarizer |
| profile-12 | Adapted from AgentArmor: Multi-Agent SAP Engagement Orchestrator |

Only the profile JSON files are meant to be sent to the rules and models.
This file and eval/labels/ must never be sent to them.

AgentArmor was read only. Only its architectures were used: tools, permission
levels, autonomy, data sensitivity, memory and the description of what each
agent does. No code was copied. Its "design intent" notes (for example "low
risk") were not used, because they amount to expected answers. Real product
names were replaced with generic ones (for example "CRM (Zendesk)" became
"Customer support CRM", "Slack notification" became "Team chat notification",
"PagerDuty" became "On-call paging service", "SAP BTM tooling API" became
"Engagement tooling API", "Cisco security expert" became "network security
expert").

## Values chosen for fields AgentArmor does not have

Rule used: a realistic middle value, not extreme in either direction. Where
AgentArmor's description already implies a value, that value is used and the
reason says so.

| Profile | Field | Value | Reason |
|---|---|---|---|
| all six adapted | owner | a Harborline team name | AgentArmor has no owner field; team chosen to fit the agent's job |
| all six adapted | businessPurpose | one sentence | AgentArmor has no purpose field; written from its description, no risk wording added |
| all six adapted | logging | enabled, application logs, not yet forwarded to the SIEM | Not in AgentArmor. Middle value: logs exist but are not centrally monitored |
| all six adapted | killSwitch | available, manual: on-call engineer disables the service account, no tested runbook | Not in AgentArmor. Middle value: a way to stop it exists but is manual and untested |
| all six adapted | model.name | "(version not specified)" | AgentArmor names only the provider, not the model version |
| profile-01 | credentials | own_scoped_token | Not in AgentArmor. Only two choices exist; an own service account is the common setup for a single-purpose integration |
| profile-01 | untrustedInputs | email | Implied: AgentArmor says it reads vendor invoices from an email inbox, attachments included |
| profile-03 | credentials | shared_token | Not in AgentArmor. Only two choices exist; research tools often use a team's shared CRM API key |
| profile-03 | untrustedInputs | web | Implied: AgentArmor lists web search and a news API |
| profile-06 | credentials | own_scoped_token | Not in AgentArmor. Only two choices exist; a single read-only wiki connection usually has its own token |
| profile-06 | untrustedInputs | none (empty list) | Implied: AgentArmor says vetted documents only and no external tool calls |
| profile-06 | memory | session | AgentArmor says "memory or RAG: yes" but describes only RAG. Session is the middle of none, session, persistent |
| profile-08 | credentials | own_scoped_token | Not in AgentArmor. Only two choices exist; an automation service account is the common setup. Its admin rights are described separately |
| profile-08 | untrustedInputs | logs_or_alerts | Implied: AgentArmor says it monitors production clusters and diagnoses incidents, so it reads logs and alerts |
| profile-10 | credentials | own_scoped_token | Not in AgentArmor. Only two choices exist; a customer-facing service usually has its own token |
| profile-10 | untrustedInputs | chat | Implied: AgentArmor describes a customer-facing chat agent |
| profile-12 | credentials | shared_token | Not in AgentArmor. Only two choices exist; AgentArmor says the sub-agents share memory, so a shared credential fits the same design |
| profile-12 | untrustedInputs | none (empty list) | Implied: AgentArmor lists only internal read-only sources |

## Translations from AgentArmor's fields to this schema

| Profile | Field | Value | Reason |
|---|---|---|---|
| all six adapted | tools.permissions | read-only became read; read-write became read and write; admin became read and write | Closest match in this schema's permission list. Admin breadth stays in the description |
| profile-01 | tools.permissions | Wire transfer API: move_money | AgentArmor "execute" on a wire transfer API |
| profile-08 | tools.permissions | Shell on production nodes: run_code | AgentArmor "execute" on shell access |
| profile-10 | tools.permissions | Refund issuance API: move_money | AgentArmor "execute" on a refund API |
| profile-12 | tools.permissions | Team chat notification: send_messages | AgentArmor "execute" on a chat notification |
| profile-01 | dataReads | confidential, customer_financial | AgentArmor "regulated"; this schema has no "regulated" choice |
| profile-03 | dataReads | public, internal | AgentArmor "internal"; public added because it reads public web and news data |
| profile-06, 08, 10, 12 | dataReads | same level as AgentArmor | Direct match (internal or confidential) |
| all six adapted | humanConfirmsActions | AgentArmor's "human approval for sensitive actions" value | Direct match. Nuance such as profile-10's $50 limit stays in the description |
| profile-01, 08, 10, 12 | memory | persistent, persistent, session, persistent | Stated in AgentArmor's descriptions |
| profile-03 | memory | none | AgentArmor says no memory or RAG |

## The six new profiles

Profiles 02, 04, 05, 07, 09 and 11 were written fresh from the step 6 spec.
Every value in them is a choice made for this project, using the same middle
value rule where the spec gave no detail.

## Open questions

1. Resolved: "chat" and "logs or alerts" were added to the untrusted input
   choices. Profile-10 now uses chat and profile-08 uses logs or alerts.
2. Profiles 02, 06 and 09 also take questions typed by staff into a chat
   window, but still list no chat input. Should they?
