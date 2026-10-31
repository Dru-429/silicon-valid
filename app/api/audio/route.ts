import { fishSpeakerOrder, getFishVoiceIds, sanitizeFishText } from "@/lib/fish-audio";
import { speakerIds, type SpeakerId } from "@/types/script";

const FISH_TTS_URL = "https://api.fish.audio/v1/tts";
const MAX_TURNS = 28;
const MAX_TOTAL_CHARACTERS = 35_000;

type AudioTurn = {
  speakerId: SpeakerId;
  fishText: string;
};

function parseTurns(value: unknown): AudioTurn[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_TURNS) return null;

  const allowedSpeakers = new Set<string>(speakerIds);
  const turns: AudioTurn[] = [];
  let totalCharacters = 0;

  for (const item of value) {
    if (!item || typeof item !== "object") return null;
    const candidate = item as { speakerId?: unknown; fishText?: unknown };
    if (
      typeof candidate.speakerId !== "string" ||
      !allowedSpeakers.has(candidate.speakerId) ||
      typeof candidate.fishText !== "string"
    ) {
      return null;
    }

    const fishText = sanitizeFishText(candidate.fishText);
    if (!fishText || fishText.length > 2_500) return null;
    totalCharacters += fishText.length;
    if (totalCharacters > MAX_TOTAL_CHARACTERS) return null;

    turns.push({ speakerId: candidate.speakerId as SpeakerId, fishText });
  }

  return turns;
}

async function fishErrorMessage(response: Response) {
  try {
    const body = (await response.json()) as { message?: string; reason?: string };
    return body.message || body.reason || "Audio generation rejected the request.";
  } catch {
    return "Audio generation rejected the request.";
  }
}

export async function POST(request: Request) {
  if (!process.env.FISH_AUDIO_API_KEY) {
    return Response.json(
      { error: "FISH_AUDIO_API_KEY is not configured. Add it to .env.local, then restart the development server." },
      { status: 503 },
    );
  }

  try {
    const body = (await request.json()) as { turns?: unknown };
    const turns = parseTurns(body?.turns);
    if (!turns) {
      return Response.json({ error: "A valid generated script with 1–28 turns is required." }, { status: 400 });
    }

    const speakerIndex = new Map(fishSpeakerOrder.map((id, index) => [id, index]));
    const text = turns
      .map((turn) => `<|speaker:${speakerIndex.get(turn.speakerId)}|>${turn.fishText}`)
      .join("\n");

    const fishResponse = await fetch(FISH_TTS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.FISH_AUDIO_API_KEY}`,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
        model: "drama-3",
      },
      body: JSON.stringify({
        text,
        reference_id: getFishVoiceIds(),
        format: "mp3",
        mp3_bitrate: 128,
        normalize: true,
        temperature: 0.72,
        top_p: 0.72,
        latency: "normal",
        prosody: {
          speed: 1,
          volume: 0,
          normalize_loudness: true,
        },
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(180_000),
    });

    if (!fishResponse.ok || !fishResponse.body) {
      const message = await fishErrorMessage(fishResponse);
      const status = fishResponse.status === 401 ? 401 : fishResponse.status === 402 ? 402 : 502;
      return Response.json({ error: message }, { status });
    }

    return new Response(fishResponse.body, {
      status: 200,
      headers: {
        "Content-Type": fishResponse.headers.get("content-type") || "audio/mpeg",
        "Cache-Control": "private, no-store",
        "Content-Disposition": "inline; filename=\"silicon-valid-roast.mp3\"",
        "X-Audio-Model": "fish-audio-drama-3",
      },
    });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return Response.json({ error: "The request body must be valid JSON." }, { status: 400 });
    }
    if (error instanceof Error && error.name === "TimeoutError") {
      return Response.json({ error: "Audio generation took too long to render this performance. Try again." }, { status: 504 });
    }

    console.error("Fish Audio generation failed:", error);
    return Response.json({ error: "The audio performance could not be generated right now." }, { status: 500 });
  }
}
