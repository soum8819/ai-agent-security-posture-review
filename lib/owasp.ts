// OWASP Top 10 for Agentic Applications for 2026 (published December 9, 2025).
// IDs and names copied exactly from the official document at genai.owasp.org.
export const ASI_CATEGORIES = [
  { id: "ASI01", name: "Agent Goal Hijack" },
  { id: "ASI02", name: "Tool Misuse and Exploitation" },
  { id: "ASI03", name: "Identity and Privilege Abuse" },
  { id: "ASI04", name: "Agentic Supply Chain Vulnerabilities" },
  { id: "ASI05", name: "Unexpected Code Execution (RCE)" },
  { id: "ASI06", name: "Memory & Context Poisoning" },
  { id: "ASI07", name: "Insecure Inter-Agent Communication" },
  { id: "ASI08", name: "Cascading Failures" },
  { id: "ASI09", name: "Human-Agent Trust Exploitation" },
  { id: "ASI10", name: "Rogue Agents" },
] as const;

export const ASI_IDS = [
  "ASI01", "ASI02", "ASI03", "ASI04", "ASI05",
  "ASI06", "ASI07", "ASI08", "ASI09", "ASI10",
] as const;

export type AsiId = (typeof ASI_IDS)[number];
