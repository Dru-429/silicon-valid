import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { buildRoastPrompt, RoastScriptSchema } from "@/lib/prompts/prompt";
import type { RepositoryContext } from "@/types/repository";

function isRepositoryContext(value: unknown): value is RepositoryContext {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<RepositoryContext>;
  return Boolean(
    candidate.repository &&
      typeof candidate.repository.owner === "string" &&
      typeof candidate.repository.name === "string" &&
      Array.isArray(candidate.contributors) &&
      Array.isArray(candidate.recentCommits) &&
      Array.isArray(candidate.structure) &&
      Array.isArray(candidate.importantFiles),
  );
}

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return Response.json(
      { error: "OPENAI_API_KEY is not configured. Add it to .env.local, then restart the development server." },
      { status: 503 },
    );
  }

  try {
    const body = (await request.json()) as { repositoryContext?: unknown };
    if (!isRepositoryContext(body?.repositoryContext)) {
      return Response.json({ error: "A valid RepositoryContext is required." }, { status: 400 });
    }

    const { instructions, input } = buildRoastPrompt(body.repositoryContext);
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await client.responses.parse({
      model: process.env.OPENAI_MODEL ?? "gpt-6.1-sol",
      reasoning: { effort: "medium" },
      max_output_tokens: 16_000,
      instructions,
      input,
      text: {
        format: zodTextFormat(RoastScriptSchema, "silicon_valid_roast_script"),
      },
    });

    if (!response.output_parsed) {
      return Response.json(
        { error: "OpenAI returned no script. The response may have been refused or incomplete." },
        { status: 502 },
      );
    }

    const script = response.output_parsed;
    const castIds = new Set(script.cast.map((member) => member.id));
    const expectedPositions = {
      dinesh: "far-left",
      gilfoyle: "left",
      richard: "center",
      jared: "right",
      erlich: "far-right",
    } as const;
    const speakerCounts = script.turns.reduce<Record<string, number>>((counts, turn) => {
      counts[turn.speakerId] = (counts[turn.speakerId] ?? 0) + 1;
      return counts;
    }, {});
    const invalidCastPosition = script.cast.some(
      (member) => member.stagePosition !== expectedPositions[member.id],
    );
    const missingSpeaker = Object.keys(expectedPositions).some((id) => (speakerCounts[id] ?? 0) < 3);

    if (script.cast.length !== 5 || castIds.size !== 5 || invalidCastPosition || missingSpeaker) {
      return Response.json({ error: "The generated script did not satisfy the panel structure." }, { status: 502 });
    }

    return Response.json(script);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return Response.json({ error: "The request body must be valid JSON." }, { status: 400 });
    }
    if (error instanceof OpenAI.AuthenticationError) {
      return Response.json({ error: "The OpenAI API key was rejected." }, { status: 401 });
    }
    if (error instanceof OpenAI.RateLimitError) {
      return Response.json({ error: "OpenAI rate limit reached. Wait a moment and try again." }, { status: 429 });
    }
    if (error instanceof OpenAI.APIError) {
      console.error("OpenAI script generation failed:", error.status, error.message);
      return Response.json({ error: `OpenAI could not generate the script (${error.status ?? "API error"}).` }, { status: 502 });
    }

    console.error("Script generation failed:", error);
    return Response.json({ error: "The roast script could not be generated right now." }, { status: 500 });
  }
}
