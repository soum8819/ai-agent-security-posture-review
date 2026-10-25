// The five-step diagram on the overview site. One gentle animation: a
// highlight moves from step to step. It runs only when the system allows
// motion (motion-safe), so with reduced motion the diagram is simply static.
import { STEPS } from "./content";

export function ReviewFlow() {
  return (
    <ol className="grid gap-3 md:grid-cols-5">
      {STEPS.map((s, i) => (
        <li key={s.title} className="relative">
          <div
            className="h-full rounded-lg border border-line bg-page p-4 motion-safe:animate-[flow-step_10s_ease-in-out_infinite]"
            style={{ animationDelay: `${i * 2}s` }}
          >
            <span className="flex size-7 items-center justify-center rounded-full border border-line-strong font-mono text-xs tabular">{i + 1}</span>
            <h3 className="mt-3 font-semibold">{s.title}</h3>
            <p className="mt-1 text-sm text-muted">{s.body}</p>
          </div>
          {i < STEPS.length - 1 && (
            <span aria-hidden className="absolute top-1/2 -right-3 z-10 hidden -translate-y-1/2 text-muted md:block">
              →
            </span>
          )}
        </li>
      ))}
    </ol>
  );
}
