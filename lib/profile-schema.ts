// The agent profile: the form a team fills in to get an agent reviewed.
// Plain-words explanation: docs/SCHEMA.md
import * as z from "zod";

export const DATA_CLASSES = [
  "public",
  "internal",
  "confidential",
  "customer_financial",
  "personal",
] as const;

export const PERMISSIONS = [
  "read",
  "write",
  "run_code",
  "send_messages",
  "move_money",
] as const;

// An empty list means the agent reads no untrusted input.
export const UNTRUSTED_INPUTS = [
  "email",
  "web",
  "uploaded_files",
  "chat",
  "logs_or_alerts",
] as const;

export const CREDENTIALS = ["own_scoped_token", "shared_token"] as const;

export const MEMORY = ["none", "session", "persistent"] as const;

const text = (max: number) => z.string().trim().min(1).max(max);

function unique<T extends z.ZodType>(item: T, label: string) {
  return z
    .array(item)
    .refine((list) => new Set(list).size === list.length, {
      message: `${label} must not repeat a value`,
    });
}

export const toolSchema = z.strictObject({
  name: text(100),
  permissions: unique(z.enum(PERMISSIONS), "permissions").min(1, {
    message: "each tool needs at least one permission",
  }),
});

export const agentProfileSchema = z.strictObject({
  id: z.string().regex(/^[a-z0-9-]{3,40}$/, {
    message: "id must be 3 to 40 lowercase letters, digits or dashes",
  }),
  name: text(100),
  owner: text(100),
  businessPurpose: text(500),
  dataReads: unique(z.enum(DATA_CLASSES), "dataReads").min(1, {
    message: "choose at least one kind of data",
  }),
  tools: z.array(toolSchema).max(20),
  humanConfirmsActions: z.boolean(),
  untrustedInputs: unique(z.enum(UNTRUSTED_INPUTS), "untrustedInputs"),
  credentials: z.enum(CREDENTIALS),
  model: z.strictObject({
    provider: text(60),
    name: text(80),
  }),
  memory: z.enum(MEMORY),
  logging: z.strictObject({
    enabled: z.boolean(),
    destination: text(200).optional(),
  }),
  killSwitch: z.strictObject({
    available: z.boolean(),
    description: text(300).optional(),
  }),
  description: text(4000),
});

export type AgentProfile = z.infer<typeof agentProfileSchema>;
export type Tool = z.infer<typeof toolSchema>;
