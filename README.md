# AI Agent Security Posture Review Workflow

A security review workflow for internal AI agents at Harborline Financial Group, a fictional global bank and insurer. Each agent is checked by rules and two AI models, then a recorded human decision is required before it can launch, cutting a manual review that takes about 15 business days.

Live site: https://ai-agent-security-posture-review.vercel.app (reviewer app: https://ai-agent-security-posture-review.vercel.app/app)

Diagram key: green is built, amber dashed is planned, and purple is the customer's own AWS.

## Architecture

System view.

```mermaid
flowchart LR
  subgraph People["People"]
    SUB["Submitter<br/>(agent team)"]
    REV["Reviewers<br/>AppSec, Model Risk"]
    AUD["Auditor"]
  end
  subgraph VERCEL["One Vercel project (Git deploy on every push)"]
    SITE["Overview site /<br/>Next.js"]
    APP["Reviewer app /app<br/>Next.js, role based views"]
    RULES["Rules engine<br/>sets severity floor and tier"]
    WF["Vercel Workflow<br/>durable review, pauses for a person"]
    GW["Vercel AI Gateway<br/>one key, budget, logs"]
    STORE["Review state store<br/>(choice pending)"]
  end
  subgraph MODELS["Models via the gateway"]
    M1["Reviewer model<br/>openai/gpt-5-mini"]
    M2["Cross-checker<br/>google/gemini-2.5-flash"]
  end
  subgraph AWS["Harborline AWS (customer owned)"]
    REG["Agent registry"]
    SSO["SSO / identity"]
    SIEM["Audit log / SIEM"]
    TKT["Ticketing"]
  end
  SUB --> APP
  REV --> APP
  AUD --> APP
  APP --> RULES --> WF
  WF --> GW
  GW --> M1
  GW --> M2
  WF <--> STORE
  APP <--> STORE
  WF -.stub.-> REG
  WF -.stub.-> SIEM
  WF -.described.-> TKT
  APP -.described.-> SSO
  classDef built fill:#d6f0e0,stroke:#1f8a4c,color:#16202b,stroke-width:2px;
  classDef planned fill:#fbefd5,stroke:#b7791f,color:#16202b,stroke-width:2px,stroke-dasharray:5 4;
  classDef host fill:#e6e2f7,stroke:#6b5fb5,color:#16202b,stroke-width:2px;
  class SITE,APP,GW,M1,M2 built;
  class RULES,WF,STORE,SUB,REV,AUD planned;
  class REG,SSO,SIEM,TKT host;
```

One Tier 3 review, step by step.

```mermaid
sequenceDiagram
  autonumber
  participant T as Submitter
  participant A as Reviewer app
  participant R as Rules engine
  participant W as Workflow
  participant G as AI Gateway
  participant M as Models 1 and 2
  participant P as Human approvers
  participant H as Harborline AWS
  T->>A: Submit agent profile (tools, data, autonomy)
  A->>R: Evaluate profile
  R-->>A: Severity floor and tier
  A->>W: Start durable review
  W->>G: Analyze against OWASP agentic risks (ASI01 to ASI10)
  G->>M: Model 1 (reviewer)
  M-->>W: Findings, structured output
  W->>G: Independent cross-check
  G->>M: Model 2 (different provider)
  M-->>W: Agree, or flag disagreement
  W->>P: Pause on a hook, notify approvers
  Note over W,P: Tier 3 needs two approvers.<br/>Tier 4 routes to a committee.
  P-->>W: Approve or reject, with reason
  W->>H: Write decision to registry (stub)
  W->>H: Append to audit log (stub)
  W-->>A: Final decision visible to submitter and auditor
```

The review state store is still undecided.
