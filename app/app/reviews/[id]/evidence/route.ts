// Download the evidence pack of a Tier 4 review. Same access rule as the
// review page: anyone who may not see the review gets "not found".
import { currentUser } from "@/lib/auth";
import { evidencePackText } from "@/lib/evidence-pack";
import { canViewReview } from "@/lib/review-access";
import { shortId } from "@/lib/review-view";
import { getReview } from "@/lib/store";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export async function GET(_request: Request, ctx: RouteContext<"/app/reviews/[id]/evidence">) {
  const user = await currentUser();
  if (!user) return new Response("Sign in required.", { status: 401 });
  const { id } = await ctx.params;
  if (!UUID.test(id)) return new Response("Not found.", { status: 404 });
  const found = await getReview(id);
  if (!found || !canViewReview(user, found.review) || !found.result || found.review.final_tier !== 4) {
    return new Response("Not found.", { status: 404 });
  }
  const text = evidencePackText({
    reviewId: found.review.id,
    submitterId: found.review.submitter_id,
    createdAt: found.review.created_at,
    profile: found.review.profile,
    result: found.result,
    generatedAt: new Date().toISOString(),
  });
  return new Response(text, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "content-disposition": `attachment; filename="evidence-pack-${shortId(found.review.id)}.txt"`,
      "cache-control": "no-store",
    },
  });
}
