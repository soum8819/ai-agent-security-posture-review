// Shared building blocks for every screen (design pass). Server-safe: no
// state, no effects. Colours come from the tokens in app/globals.css.
import Link from "next/link";
import type { ReactNode } from "react";
import { SEVERITY_WORDS, STATUS_SHORT } from "@/lib/review-view";
import type { ReviewStatus } from "@/lib/limits";
import type { Severity } from "@/lib/rules";

export const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(" ");

// Buttons and links styled as buttons. Hit area at least 40px tall, 44px on phones.
const base =
  "inline-flex min-h-11 sm:min-h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50";
export const button = {
  primary: cx(base, "bg-ink text-page hover:opacity-90"),
  secondary: cx(base, "border border-line bg-page text-ink hover:bg-fill"),
  accent: cx(base, "bg-accent text-accent-ink hover:opacity-90"),
};

export const link = "text-accent underline-offset-2 hover:underline";

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: ReactNode; title: ReactNode; description?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <div className="mb-2 text-sm text-muted">{eyebrow}</div>}
        <h1 className="text-2xl font-semibold tracking-tight text-balance break-words sm:text-[32px] sm:leading-10">{title}</h1>
        {description && <div className="mt-2 max-w-2xl text-pretty text-muted">{description}</div>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

export function Card({ children, className, as: Tag = "div" }: { children: ReactNode; className?: string; as?: "div" | "section" | "li" | "article" }) {
  return <Tag className={cx("rounded-lg border border-line bg-page", className)}>{children}</Tag>;
}

export function SectionTitle({ id, children, aside }: { id?: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <h2 id={id} className="text-lg font-semibold tracking-tight">{children}</h2>
      {aside && <div className="text-sm text-muted">{aside}</div>}
    </div>
  );
}

const SEVERITY_CLASS: Record<Severity, string> = {
  critical: "bg-sev-critical-bg text-sev-critical-fg",
  high: "bg-sev-high-bg text-sev-high-fg",
  medium: "bg-sev-medium-bg text-sev-medium-fg",
  low: "bg-sev-low-bg text-sev-low-fg",
};

// The word is always shown; colour only supports it.
export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span className={cx("inline-flex h-6 items-center rounded px-2 text-xs font-semibold", SEVERITY_CLASS[severity])}>
      <span className="sr-only">Severity: </span>
      {SEVERITY_WORDS[severity]}
    </span>
  );
}

// "Tier 1" to "Tier 4". Higher tiers look stronger; Tier 4 also says Committee,
// so the meaning never depends on colour.
// Tier chips get stronger with the tier: Tier 1 quiet, Tier 2 a little
// stronger, Tier 3 an amber outline, Tier 4 filled. Every chip keeps the word
// "Tier" and the digit (Tier 4 also says Committee), so colour is never the
// only signal.
const TIER_TONE: Record<number, string> = {
  1: "border-line bg-page text-muted",
  2: "border-line-strong bg-fill text-ink",
  3: "border-tier3-line bg-tier3-bg text-tier3-fg",
  4: "border-ink bg-ink text-page",
};

const TIER_SIZE = {
  md: "h-6 px-2 text-xs",
  lg: "h-9 px-3 text-base",
  xl: "h-12 px-3.5 text-3xl font-semibold",
};

export function TierChip({ tier, size = "md" }: { tier: number | null; size?: keyof typeof TIER_SIZE }) {
  if (tier === null) return <span className="text-sm text-muted">Not yet</span>;
  return (
    <span
      data-tier={tier}
      className={cx(
        "inline-flex items-center gap-1.5 rounded-md font-medium whitespace-nowrap",
        tier === 3 ? "border-2" : "border",
        TIER_TONE[Math.min(Math.max(tier, 1), 4)],
        TIER_SIZE[size],
      )}
    >
      <span>
        Tier <span className="tabular font-mono">{tier}</span>
      </span>
      {tier >= 4 && <span className={cx("font-normal opacity-80", size === "xl" && "text-base")}>Committee</span>}
    </span>
  );
}

const DOT: Record<string, string> = {
  ok: "bg-dot-ok",
  warn: "bg-dot-warn",
  bad: "bg-dot-bad",
  info: "bg-dot-info",
  neutral: "bg-dot-neutral",
};

export function StatusPill({ status }: { status: ReviewStatus }) {
  const s = STATUS_SHORT[status] ?? { label: status, tone: "neutral" };
  return (
    <span className="inline-flex h-6 items-center gap-1.5 rounded-full border border-line bg-subtle px-2.5 text-xs font-medium whitespace-nowrap text-ink">
      <span aria-hidden className={cx("size-1.5 rounded-full", DOT[s.tone])} />
      {s.label}
    </span>
  );
}

export function EmptyState({ title, body, action }: { title: string; body?: ReactNode; action?: { href: string; label: string } }) {
  return (
    <div className="rounded-lg border border-dashed border-line-strong px-6 py-12 text-center">
      <p className="font-medium">{title}</p>
      {body && <p className="mx-auto mt-1 max-w-md text-sm text-muted">{body}</p>}
      {action && (
        <Link href={action.href} className={cx(button.primary, "mt-4")}>
          {action.label}
        </Link>
      )}
    </div>
  );
}

// Loading placeholder shaped like the content. Suspense already waits briefly
// before showing it, so fast pages never flash.
export function Skeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div aria-busy="true" aria-live="polite" className="space-y-3 py-2">
      <span className="sr-only">Loading…</span>
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} className={cx("h-4 rounded bg-fill motion-safe:animate-pulse", i === 0 ? "w-1/3" : i % 2 ? "w-full" : "w-5/6")} />
      ))}
    </div>
  );
}

export function Notice({ tone = "neutral", title, children, role }: { tone?: "neutral" | "warn" | "bad" | "ok"; title?: ReactNode; children?: ReactNode; role?: "alert" | "status" | "note" }) {
  const border = { neutral: "border-line", warn: "border-dot-warn", bad: "border-dot-bad", ok: "border-dot-ok" }[tone];
  return (
    <div role={role} className={cx("rounded-lg border border-l-4 bg-subtle px-4 py-3", border)}>
      {title && <p className="font-medium">{title}</p>}
      {children && <div className={cx("text-sm", title ? "mt-1 text-muted" : "")}>{children}</div>}
    </div>
  );
}
