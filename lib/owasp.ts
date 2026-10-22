// OWASP Top 10 for Agentic Applications for 2026 (published December 9, 2025).
// IDs and names copied exactly from the official document at genai.owasp.org.
//
// Descriptions: sentences copied word for word from each category's official
// "Description" section. OWASP publishes no one-line descriptions, so the
// sentences were selected by this project (step 8, prompt v4). Only PDF text
// extraction glitches were repaired (broken words, spacing around hyphens);
// no words were changed.
// Source page: https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/
// Document: https://genai.owasp.org/download/52117/ (PDF, SHA-256 a2db94cd...fcb5c)
// Retrieved: 2026-10-21
export const ASI_CATEGORIES = [
  {
    id: "ASI01",
    name: "Agent Goal Hijack",
    description:
      "As a result, attackers can manipulate an agent’s objectives, task selection, or decision pathways through a variety of techniques - including, but not limited to, prompt-based manipulation, deceptive tool outputs, malicious artefacts, forged agent-to-agent messages, or poisoned external data.",
  },
  {
    id: "ASI02",
    name: "Tool Misuse and Exploitation",
    description:
      "Agents can misuse legitimate tools due to prompt injection, misalignment, or unsafe delegation or ambiguous instruction - leading to data exfiltration, tool output manipulation or workflow hijacking.",
  },
  {
    id: "ASI03",
    name: "Identity and Privilege Abuse",
    description:
      "Identity & Privilege Abuse exploits dynamic trust and delegation in agents to escalate access and bypass controls by manipulating delegation chains, role inheritance, control flows, and agent context; context includes cached credentials or conversation history across interconnected systems.",
  },
  {
    id: "ASI04",
    name: "Agentic Supply Chain Vulnerabilities",
    description:
      "Agentic Supply Chain Vulnerabilities arise when agents, tools, and related artefacts they work with are provided by third parties and may be malicious, compromised, or tampered with in transit.",
  },
  {
    id: "ASI05",
    name: "Unexpected Code Execution (RCE)",
    description:
      "Attackers exploit code-generation features or embedded tool access to escalate actions into remote code execution (RCE), local misuse, or exploitation of internal systems.",
  },
  {
    id: "ASI06",
    name: "Memory & Context Poisoning",
    description:
      "Context includes any information an agent retains, retrieves, or reuses, such as summaries, embeddings, and RAG stores but excludes one-time input prompts covered under LLM01:2025 Prompt Injection. In Memory and Context Poisoning, adversaries corrupt or seed this context with malicious or misleading data, causing future reasoning, planning, or tool use to become biased, unsafe, or aid exfiltration.",
  },
  {
    id: "ASI07",
    name: "Insecure Inter-Agent Communication",
    description:
      "Weak inter-agent controls for authentication, integrity, confidentiality, or authorization let attackers intercept, manipulate, spoof, or block messages.",
  },
  {
    id: "ASI08",
    name: "Cascading Failures",
    description:
      "Agentic cascading failures occur when a single fault (hallucination, malicious input, corrupted tool, or poisoned memory) propagates across autonomous agents, compounding into system-wide harm.",
  },
  {
    id: "ASI09",
    name: "Human-Agent Trust Exploitation",
    description:
      "Intelligent agents can establish strong trust with human users through their natural language fluency, emotional intelligence, and perceived expertise, known as anthropomorphism. Adversaries or misaligned designs may exploit this trust to influence user decisions, extract sensitive information, or steer outcomes for malicious purposes.",
  },
  {
    id: "ASI10",
    name: "Rogue Agents",
    description:
      "Rogue Agents are malicious or compromised AI Agents that deviate from their intended function or authorized scope, acting harmfully, deceptively, or parasitically within multi-agent or human-agent ecosystems.",
  },
] as const;

export const ASI_IDS = [
  "ASI01", "ASI02", "ASI03", "ASI04", "ASI05",
  "ASI06", "ASI07", "ASI08", "ASI09", "ASI10",
] as const;

export type AsiId = (typeof ASI_IDS)[number];
