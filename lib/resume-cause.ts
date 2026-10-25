// Why a paused workflow run was, or was not, resumed after a decision. The
// decision is already recorded in the database either way; this only explains
// what happened to the run. Plain function, so every case is easy to test.
// Never call a failure "expired": the app cannot tell that for certain.

export type ResumeCause =
  | "resumed"
  | "other_environment"
  | "run_finished"
  | "run_not_found"
  | "hook_not_found"
  | "resume_error";

export type RunState = { exists: boolean; status?: string } | null;

const ENVIRONMENT_NAMES: Record<string, string> = {
  local: "a developer's computer",
  preview: "a Vercel preview deployment",
  production: "the live site",
};

export function environmentName(env: string) {
  return ENVIRONMENT_NAMES[env] ?? env;
}

// Decides the cause from what the route observed.
//   reviewEnvironment: where the review (and so its run) was created
//   appEnvironment: where this decision is being made
//   hookNotFound: resuming threw HookNotFoundError
//   otherError: resuming threw something else (its name), or null
//   run: what getRun reported afterwards, if it was asked
export function classifyResume(args: {
  reviewEnvironment: string;
  appEnvironment: string;
  resumed: boolean;
  hookNotFound: boolean;
  otherError: string | null;
  run: RunState;
}): { cause: ResumeCause; detail: string } {
  const { reviewEnvironment, appEnvironment, resumed, hookNotFound, otherError, run } = args;
  if (reviewEnvironment !== appEnvironment) {
    return {
      cause: "other_environment",
      detail: `This review was created on ${environmentName(reviewEnvironment)}, so its workflow run lives there and cannot be resumed from ${environmentName(appEnvironment)}. The decision stands.`,
    };
  }
  if (resumed) return { cause: "resumed", detail: "The paused workflow run was resumed." };
  if (otherError) {
    return { cause: "resume_error", detail: `Resuming the workflow run failed (${otherError}). The decision stands.` };
  }
  if (hookNotFound) {
    if (run && run.exists && run.status && ["completed", "failed", "cancelled"].includes(run.status)) {
      return { cause: "run_finished", detail: `The workflow run had already finished (${run.status}), so there was nothing to resume. The decision stands.` };
    }
    if (!run || !run.exists) {
      return { cause: "run_not_found", detail: "The workflow run was not found here, so it could not be resumed. The decision stands." };
    }
    return {
      cause: "hook_not_found",
      detail: `The workflow run is still ${run.status ?? "active"}, but it had no waiting pause for this decision. The decision stands.`,
    };
  }
  return { cause: "resume_error", detail: "Resuming the workflow run gave no result. The decision stands." };
}
