import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import {
  buildReviewerPrompt,
  consolidateFixAnalysis,
  ReviewerResultSchema,
  type ReviewerResult,
} from "@/lib/fix-analysis";
import { fixCategories, type FixAnalysisEvent, type FixCategory } from "@/types/fix-analysis";
import type { RepositoryContext } from "@/types/repository";

function isRepositoryContext(value: unknown): value is RepositoryContext {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<RepositoryContext>;
  return Boolean(
    candidate.repository &&
      typeof candidate.repository.owner === "string" &&
      typeof candidate.repository.name === "string" &&
      Array.isArray(candidate.structure) &&
      Array.isArray(candidate.importantFiles),
  );
}

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return Response.json({ error: "Repository fix analysis is not configured." }, { status: 503 });
  }

  let body: { analysisId?: unknown; repositoryContext?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "The request body must be valid JSON." }, { status: 400 });
  }

  if (typeof body.analysisId !== "string" || !body.analysisId.trim() || !isRepositoryContext(body.repositoryContext)) {
    return Response.json({ error: "A valid analysis ID and RepositoryContext are required." }, { status: 400 });
  }

  const analysisId = body.analysisId;
  const context = body.repositoryContext;
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let streamOpen = true;
      const emit = (event: FixAnalysisEvent) => {
        if (!streamOpen || request.signal.aborted) return;
        try {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        } catch {
          streamOpen = false;
        }
      };

      const close = () => {
        if (!streamOpen) return;
        streamOpen = false;
        try {
          controller.close();
        } catch {
          // The client may have left the debate while analysis was running.
        }
      };

      void (async () => {
        try {
          const reviewerInputs = fixCategories.map((category) => ({ category, ...buildReviewerPrompt(context, category) }));
          const processedFiles = new Set<string>();
          for (const reviewer of reviewerInputs) {
            for (const file of reviewer.filePaths) {
              if (processedFiles.has(file)) continue;
              processedFiles.add(file);
              emit({ type: "file-read", file });
            }
          }

          const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
          const reviewerPromises = reviewerInputs.map(async ({ category, instructions, input }) => {
            try {
              const response = await client.responses.parse({
                model: process.env.OPENAI_FIX_MODEL ?? process.env.OPENAI_MODEL ?? "gpt-6.1-sol",
                reasoning: { effort: "medium" },
                max_output_tokens: 6_000,
                instructions,
                input,
                text: { format: zodTextFormat(ReviewerResultSchema, `silicon_valid_${category.replace("-", "_")}_review`) },
              });

              if (!response.output_parsed) throw new Error(`${category} reviewer returned no structured output.`);
              emit({ type: "analysis-complete", category });
              return { category, review: response.output_parsed as ReviewerResult };
            } catch (error) {
              console.error(`Fix analysis ${category} reviewer failed:`, error);
              emit({ type: "analysis-unavailable", category });
              throw error;
            }
          });

          const settled = await Promise.allSettled(reviewerPromises);
          const reviews = settled.flatMap((result) => (result.status === "fulfilled" ? [result.value] : []));
          const unavailableCategories = settled.flatMap((result, index) =>
            result.status === "rejected" ? [fixCategories[index] as FixCategory] : [],
          );

          if (!reviews.length) throw new Error("All repository reviewers failed.");

          emit({ type: "finalizing" });
          const result = consolidateFixAnalysis({ analysisId, context, reviews, unavailableCategories });
          emit({ type: "complete", result });
        } catch (error) {
          console.error("Background fix analysis failed:", error);
          emit({ type: "error", message: "We couldn't complete the repository review." });
        } finally {
          close();
        }
      })();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

