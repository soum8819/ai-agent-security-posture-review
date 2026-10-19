// TEMPORARY SPIKE (build step 4): proves one model call works through
// AI Gateway. Delete this route when step 8 replaces it.
import { generateText } from "ai";
import { connection, type NextRequest } from "next/server";
import { ALLOWED_MODELS, isAllowedModel } from "@/lib/models";

export async function GET(request: NextRequest) {
  // Run on every request instead of being saved once at build time.
  await connection();

  // Local only: 404 on every Vercel deployment and outside `npm run dev`.
  if (process.env.VERCEL || process.env.NODE_ENV !== "development") {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const model = request.nextUrl.searchParams.get("model");
  if (!isAllowedModel(model)) {
    return Response.json(
      { error: "Unknown model", allowed: ALLOWED_MODELS },
      { status: 400 },
    );
  }

  try {
    const result = await generateText({
      model,
      prompt: "Say hello in five words",
      maxOutputTokens: 300,
      reasoning: "minimal",
    });

    return Response.json({
      model,
      reply: result.text,
      usage: result.usage,
    });
  } catch {
    // Never echo the raw error: keep the response free of anything sensitive.
    return Response.json(
      {
        error:
          "Model call failed. Check AI_GATEWAY_API_KEY in .env.local, then restart npm run dev.",
      },
      { status: 502 },
    );
  }
}
