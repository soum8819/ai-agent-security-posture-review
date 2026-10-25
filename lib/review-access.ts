// The one rule for who may see a review. The queue's database query and the
// review page both use it: reviewers and the Auditor see every review; a
// Submitter sees only their own. Anyone else gets "not found".
import { can } from "./permissions.ts";
import type { User } from "./users.ts";

export type ReviewScope = { kind: "all" } | { kind: "submitter"; submitterId: string };

export function reviewScope(user: User): ReviewScope {
  return can(user.role, "view_all_reviews") ? { kind: "all" } : { kind: "submitter", submitterId: user.id };
}

export function canViewReview(user: User, review: { submitter_id: string }) {
  const scope = reviewScope(user);
  return scope.kind === "all" || review.submitter_id === scope.submitterId;
}

// Only the review's own submitter may resubmit it, only after "Request
// changes", and only once (the database also refuses a second resubmission).
export function canResubmit(user: User, review: { submitter_id: string; status: string }, alreadyResubmitted: boolean) {
  return (
    can(user.role, "submit_profile") &&
    review.submitter_id === user.id &&
    review.status === "changes_requested" &&
    !alreadyResubmitted
  );
}
