"use client";

import { useState } from "react";
import {
  agentProfileSchema,
  CREDENTIALS,
  DATA_CLASSES,
  MEMORY,
  PERMISSIONS,
  UNTRUSTED_INPUTS,
  type Tool,
} from "@/lib/profile-schema";
import { SAMPLE_PROFILES } from "@/lib/sample-profiles";

const LABELS: Record<string, string> = {
  public: "Public",
  internal: "Internal",
  confidential: "Confidential",
  customer_financial: "Customer financial",
  personal: "Personal",
  read: "Read",
  write: "Write",
  run_code: "Run code",
  send_messages: "Send messages",
  move_money: "Move money",
  email: "Email",
  web: "Web",
  uploaded_files: "Uploaded files",
  chat: "Chat",
  logs_or_alerts: "Logs or alerts",
  own_scoped_token: "Its own scoped token",
  shared_token: "A shared token",
  none: "None",
  session: "Session only",
  persistent: "Persistent",
  yes: "Yes",
  no: "No",
};

type Draft = {
  id: string;
  name: string;
  owner: string;
  businessPurpose: string;
  dataReads: string[];
  tools: { name: string; permissions: string[] }[];
  humanConfirmsActions: boolean | null;
  untrustedInputs: string[];
  credentials: string;
  model: { provider: string; name: string };
  memory: string;
  logging: { enabled: boolean; destination: string };
  killSwitch: { available: boolean; description: string };
  description: string;
};

const EMPTY: Draft = {
  id: "",
  name: "",
  owner: "",
  businessPurpose: "",
  dataReads: [],
  tools: [{ name: "", permissions: [] }],
  humanConfirmsActions: null,
  untrustedInputs: [],
  credentials: "",
  model: { provider: "", name: "" },
  memory: "",
  logging: { enabled: false, destination: "" },
  killSwitch: { available: false, description: "" },
  description: "",
};

type Result = { ok: true } | { ok: false; issues: string[] } | null;

// Turn the form state into the shape the schema expects.
function toInput(d: Draft) {
  return {
    ...d,
    humanConfirmsActions: d.humanConfirmsActions ?? undefined,
    credentials: d.credentials || undefined,
    memory: d.memory || undefined,
    logging: {
      enabled: d.logging.enabled,
      destination: d.logging.destination.trim() || undefined,
    },
    killSwitch: {
      available: d.killSwitch.available,
      description: d.killSwitch.description.trim() || undefined,
    },
  };
}

function toDraft(sample: unknown): Draft {
  const p = agentProfileSchema.parse(sample);
  return {
    ...p,
    tools: p.tools.map((t: Tool) => ({ ...t, permissions: [...t.permissions] })),
    logging: { enabled: p.logging.enabled, destination: p.logging.destination ?? "" },
    killSwitch: {
      available: p.killSwitch.available,
      description: p.killSwitch.description ?? "",
    },
  };
}

function toggle(list: string[], value: string) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

const inputClass =
  "mt-1 w-full rounded border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="mt-6">
      <div className="font-medium">{label}</div>
      {hint && <div className="text-sm text-zinc-500">{hint}</div>}
      {children}
    </div>
  );
}

function Checkboxes({ options, value, onChange }: { options: readonly string[]; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="mt-2 flex flex-wrap gap-4">
      {options.map((o) => (
        <label key={o} className="flex items-center gap-2">
          <input type="checkbox" checked={value.includes(o)} onChange={() => onChange(toggle(value, o))} />
          {LABELS[o] ?? o}
        </label>
      ))}
    </div>
  );
}

function Radios({ name, options, value, onChange }: { name: string; options: readonly string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="mt-2 flex flex-wrap gap-4">
      {options.map((o) => (
        <label key={o} className="flex items-center gap-2">
          <input type="radio" name={name} checked={value === o} onChange={() => onChange(o)} />
          {LABELS[o] ?? o}
        </label>
      ))}
    </div>
  );
}

export function SubmitForm() {
  const [d, setD] = useState<Draft>(EMPTY);
  const [result, setResult] = useState<Result>(null);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setD((prev) => ({ ...prev, [key]: value }));
    setResult(null);
  };

  const setTool = (i: number, tool: Draft["tools"][number]) =>
    set("tools", d.tools.map((t, j) => (j === i ? tool : t)));

  function validate() {
    const parsed = agentProfileSchema.safeParse(toInput(d));
    setResult(
      parsed.success
        ? { ok: true }
        : {
            ok: false,
            issues: parsed.error.issues.map(
              (i) => `${i.path.join(".") || "profile"}: ${i.message}`,
            ),
          },
    );
  }

  return (
    <form
      className="mt-8"
      onSubmit={(e) => {
        e.preventDefault();
        validate();
      }}
    >
      <label className="block text-sm text-zinc-500">
        Load a sample profile
        <select
          className={inputClass}
          defaultValue=""
          onChange={(e) => {
            const i = Number(e.target.value);
            setD(e.target.value === "" ? EMPTY : toDraft(SAMPLE_PROFILES[i]));
            setResult(null);
          }}
        >
          <option value="">Empty form</option>
          {SAMPLE_PROFILES.map((_, i) => (
            <option key={i} value={i}>
              profile-{String(i + 1).padStart(2, "0")}
            </option>
          ))}
        </select>
      </label>

      <Field label="Profile id" hint="3 to 40 lowercase letters, digits or dashes">
        <input className={inputClass} value={d.id} onChange={(e) => set("id", e.target.value)} />
      </Field>
      <Field label="Agent name">
        <input className={inputClass} value={d.name} onChange={(e) => set("name", e.target.value)} />
      </Field>
      <Field label="Owner" hint="The team accountable for the agent">
        <input className={inputClass} value={d.owner} onChange={(e) => set("owner", e.target.value)} />
      </Field>
      <Field label="Business purpose">
        <textarea className={inputClass} rows={2} value={d.businessPurpose} onChange={(e) => set("businessPurpose", e.target.value)} />
      </Field>

      <Field label="Data it reads" hint="Choose all that apply">
        <Checkboxes options={DATA_CLASSES} value={d.dataReads} onChange={(v) => set("dataReads", v)} />
      </Field>

      <Field label="Tools and permissions">
        {d.tools.map((tool, i) => (
          <div key={i} className="mt-3 rounded border border-zinc-200 p-3 dark:border-zinc-800">
            <div className="flex gap-2">
              <input
                className={inputClass}
                placeholder="Tool name"
                value={tool.name}
                onChange={(e) => setTool(i, { ...tool, name: e.target.value })}
              />
              <button
                type="button"
                className="mt-1 rounded border border-zinc-300 px-3 text-sm dark:border-zinc-700"
                onClick={() => set("tools", d.tools.filter((_, j) => j !== i))}
              >
                Remove
              </button>
            </div>
            <Checkboxes
              options={PERMISSIONS}
              value={tool.permissions}
              onChange={(v) => setTool(i, { ...tool, permissions: v })}
            />
          </div>
        ))}
        <button
          type="button"
          className="mt-3 rounded border border-zinc-300 px-3 py-1 text-sm dark:border-zinc-700"
          onClick={() => set("tools", [...d.tools, { name: "", permissions: [] }])}
        >
          Add a tool
        </button>
      </Field>

      <Field label="Does a person confirm its actions?">
        <Radios
          name="humanConfirmsActions"
          options={["yes", "no"]}
          value={d.humanConfirmsActions === null ? "" : d.humanConfirmsActions ? "yes" : "no"}
          onChange={(v) => set("humanConfirmsActions", v === "yes")}
        />
      </Field>

      <Field label="Untrusted inputs it reads" hint="Leave all unticked if none">
        <Checkboxes options={UNTRUSTED_INPUTS} value={d.untrustedInputs} onChange={(v) => set("untrustedInputs", v)} />
      </Field>

      <Field label="Credentials">
        <Radios name="credentials" options={CREDENTIALS} value={d.credentials} onChange={(v) => set("credentials", v)} />
      </Field>

      <Field label="Model and provider">
        <div className="flex gap-2">
          <input className={inputClass} placeholder="Provider" value={d.model.provider} onChange={(e) => set("model", { ...d.model, provider: e.target.value })} />
          <input className={inputClass} placeholder="Model" value={d.model.name} onChange={(e) => set("model", { ...d.model, name: e.target.value })} />
        </div>
      </Field>

      <Field label="Memory">
        <Radios name="memory" options={MEMORY} value={d.memory} onChange={(v) => set("memory", v)} />
      </Field>

      <Field label="Logging">
        <label className="mt-2 flex items-center gap-2">
          <input type="checkbox" checked={d.logging.enabled} onChange={(e) => set("logging", { ...d.logging, enabled: e.target.checked })} />
          Its actions are logged
        </label>
        <input className={inputClass} placeholder="Where the logs go (optional)" value={d.logging.destination} onChange={(e) => set("logging", { ...d.logging, destination: e.target.value })} />
      </Field>

      <Field label="Kill switch">
        <label className="mt-2 flex items-center gap-2">
          <input type="checkbox" checked={d.killSwitch.available} onChange={(e) => set("killSwitch", { ...d.killSwitch, available: e.target.checked })} />
          It can be stopped quickly
        </label>
        <input className={inputClass} placeholder="How it is stopped (optional)" value={d.killSwitch.description} onChange={(e) => set("killSwitch", { ...d.killSwitch, description: e.target.value })} />
      </Field>

      <Field label="Description" hint="In your own words: what the agent does and how">
        <textarea className={inputClass} rows={6} value={d.description} onChange={(e) => set("description", e.target.value)} />
      </Field>

      <button type="submit" className="mt-8 rounded bg-zinc-900 px-5 py-2 font-medium text-white dark:bg-zinc-100 dark:text-zinc-900">
        Validate
      </button>

      {result?.ok && (
        <p role="status" className="mt-4 rounded border border-green-700 bg-green-50 p-3 text-green-900">
          Valid: this profile matches the schema.
        </p>
      )}
      {result && !result.ok && (
        <div role="alert" className="mt-4 rounded border border-red-700 bg-red-50 p-3 text-red-900">
          <p className="font-medium">Not valid yet. Fix these:</p>
          <ul className="mt-2 list-disc pl-5">
            {result.issues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        </div>
      )}
    </form>
  );
}
