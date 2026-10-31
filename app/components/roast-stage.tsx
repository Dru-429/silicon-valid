"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import type { RoastGesture, SiliconValidScript, SpeakerId, StagePosition } from "@/types/script";

type PlaybackMode = "generated" | "default";

type RoastStageProps = {
  script: SiliconValidScript;
  playbackMode: PlaybackMode;
  repositoryUrl: string;
  onBack: () => void;
  onReset: () => void;
  onGenerateFixPlan: () => void;
  onPlaybackStarted?: () => void;
  onPlaybackFinished?: () => void;
};

type AudioState = "idle" | "generating" | "ready" | "error";

const positionOrder: Record<StagePosition, number> = {
  "far-left": 0,
  left: 1,
  center: 2,
  right: 3,
  "far-right": 4,
};

const characterLook: Record<SpeakerId, { image: string; pose: string; mouthLeft: string; mouthTop: string }> = {
  dinesh: { image: "/dinesh.png", pose: "-rotate-2", mouthLeft: "49%", mouthTop: "16.5%" },
  gilfoyle: { image: "/gilfoyle.png", pose: "rotate-1", mouthLeft: "48%", mouthTop: "15.5%" },
  richard: { image: "/richad.png", pose: "-rotate-1", mouthLeft: "49%", mouthTop: "18.2%" },
  jared: { image: "/jared.png", pose: "rotate-1", mouthLeft: "51%", mouthTop: "16.1%" },
  erlich: { image: "/erlich.png", pose: "rotate-2", mouthLeft: "51%", mouthTop: "15.2%" },
};

const phaseLabels = {
  "first-impression": "Act I - First impression",
  "technical-autopsy": "Act II - Technical autopsy",
  fight: "Act III - Everybody fights",
  "unexpected-praise": "Act IV - Unexpected praise",
  "final-verdict": "Finale - The verdict",
};

const gestureAnimation = {
  open_hands: { y: [0, -8, 0], scale: [1.02, 1.07, 1.02], rotate: [-1, 1, -1] },
  hands_up: { y: [0, -14, 0], scale: [1.02, 1.1, 1.02], rotate: [-3, 3, -3] },
  pointing: { x: [0, 7, 0], y: [0, -5, 0], scale: 1.06, rotate: [-1, 2, -1] },
  arms_crossed: { y: [0, -3, 0], scale: 1.04, rotate: 0 },
  chin_touch: { y: [0, -5, 0], scale: [1.02, 1.05, 1.02], rotate: [-2, 0, -2] },
  smirk_pose: { x: [0, -3, 0], y: [0, -3, 0], scale: 1.04, rotate: [1, -1, 1] },
  shrug: { y: [0, -7, 0], scale: [1.02, 1.06, 1.02], rotate: [-2, 2, -2] },
} satisfies Record<RoastGesture, object>;

function CharacterPortrait({
  id,
  active,
  speaking,
  gesture,
  reduceMotion,
}: {
  id: SpeakerId;
  active: boolean;
  speaking: boolean;
  gesture?: RoastGesture;
  reduceMotion: boolean;
}) {
  const look = characterLook[id];

  return (
    <motion.div
      className={`stage-character ${look.pose}`}
      animate={
        active
          ? reduceMotion
            ? { y: 0, scale: 1.05, opacity: 1 }
            : { ...(gestureAnimation[gesture ?? "open_hands"]), opacity: 1 }
          : { y: 0, scale: 0.92, opacity: 0.48, x: 0, rotate: 0 }
      }
      transition={
        active
          ? { duration: reduceMotion ? 0 : 0.75, repeat: speaking && !reduceMotion ? Infinity : 0, ease: "easeInOut" }
          : { duration: 0.25 }
      }
    >
      <Image
        src={look.image}
        alt=""
        width={1024}
        height={1536}
        sizes="(max-width: 768px) 120px, 150px"
        loading="eager"
        className="stage-character-image"
      />
      <span
        aria-hidden="true"
        className={`stage-image-mouth ${speaking ? "stage-image-mouth-talking" : ""}`}
        style={{ left: look.mouthLeft, top: look.mouthTop }}
      />
    </motion.div>
  );
}

function spokenWeight(text: string) {
  const spoken = text.replace(/\[[^\]]*]/g, "").replace(/<[^>]+>/g, "").trim();
  return Math.max(1, spoken.length);
}

function localTurnDuration(displayText: string) {
  return Math.max(2200, Math.min(7000, displayText.length * 45));
}

export function SiliconValidStage({ script, playbackMode, repositoryUrl, onBack, onReset, onGenerateFixPlan, onPlaybackStarted, onPlaybackFinished }: RoastStageProps) {
  const reduceMotion = Boolean(useReducedMotion());
  const audioRef = useRef<HTMLAudioElement>(null);
  const playbackStartedRef = useRef(false);
  const playbackFinishedRef = useRef(false);
  const [turnIndex, setTurnIndex] = useState(0);
  const [playing, setPlaying] = useState(playbackMode === "default");
  const [showTranscript, setShowTranscript] = useState(true);
  const [showFinalVerdict, setShowFinalVerdict] = useState(false);
  const [copied, setCopied] = useState(false);
  const [audioState, setAudioState] = useState<AudioState>("idle");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [audioProgress, setAudioProgress] = useState(0);

  const cast = useMemo(
    () => [...script.cast].sort((a, b) => positionOrder[a.stagePosition] - positionOrder[b.stagePosition]),
    [script.cast],
  );
  const turnTimeline = useMemo(() => {
    const weights = script.turns.map((item) => spokenWeight(item.fishText));
    const total = weights.reduce((sum, weight) => sum + weight, 0);
    return weights.reduce<{ start: number; end: number }[]>((timeline, weight) => {
      const start = timeline.at(-1)?.end ?? 0;
      return [...timeline, { start, end: start + weight / total }];
    }, []);
  }, [script.turns]);

  const turn = script.turns[turnIndex];
  const speaker = script.cast.find((member) => member.id === turn.speakerId);
  const repositoryLabel = script.repositoryLabel ?? "local/default-repository";
  const score = script.scores?.overall ?? (script.verdict ? script.verdict.score / 10 : 0);
  const verdictLabel = script.finalVerdict?.label ?? script.verdict?.siliconValidVerdict ?? "Needs Work";
  const verdictSummary = script.finalVerdict?.summary ?? script.verdict?.fixFirst ?? "The fundamentals are there. The architecture needs therapy.";

  useEffect(() => {
    if (!playing || playbackStartedRef.current) return;
    playbackStartedRef.current = true;
    onPlaybackStarted?.();
  }, [onPlaybackStarted, playing]);

  useEffect(() => {
    if (playbackMode !== "default" || !playing || showFinalVerdict) return;

    const timer = window.setTimeout(() => {
      if (turnIndex === script.turns.length - 1) {
        setPlaying(false);
        setShowFinalVerdict(true);
        if (!playbackFinishedRef.current) {
          playbackFinishedRef.current = true;
          onPlaybackFinished?.();
        }
        return;
      }
      setTurnIndex((current) => current + 1);
    }, localTurnDuration(turn.displayText));

    return () => window.clearTimeout(timer);
  }, [onPlaybackFinished, playbackMode, playing, script.turns.length, showFinalVerdict, turn.displayText, turnIndex]);

  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  async function copyScript() {
    try {
      await navigator.clipboard.writeText(JSON.stringify(script, null, 2));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  function downloadTranscript() {
    const transcript = script.turns
      .map((item, index) => {
        const member = script.cast.find((candidate) => candidate.id === item.speakerId);
        return `${String(index + 1).padStart(2, "0")}. ${member?.name ?? item.speakerName}: ${item.displayText}`;
      })
      .join("\n\n");
    const url = URL.createObjectURL(new Blob([transcript], { type: "text/plain;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${repositoryLabel.replace("/", "-")}-debate-transcript.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function generateAudio() {
    if (playbackMode === "default") return;

    setAudioState("generating");
    setAudioError(null);
    setPlaying(false);

    try {
      const response = await fetch("/api/audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          turns: script.turns.map(({ speakerId, fishText }) => ({ speakerId, fishText })),
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "Audio generation could not render the performance.");
      }

      const blob = await response.blob();
      if (!blob.size) throw new Error("Audio generation returned an empty audio file.");

      const nextUrl = URL.createObjectURL(blob);
      setAudioUrl(nextUrl);
      setAudioState("ready");
      setAudioProgress(0);
      setTurnIndex(0);
      setShowFinalVerdict(false);
    } catch (caught) {
      setAudioState("error");
      setAudioError(caught instanceof Error ? caught.message : "Audio generation could not render the performance.");
    }
  }

  async function togglePlayback() {
    if (playbackMode === "default") {
      if (showFinalVerdict) {
        setTurnIndex(0);
        setShowFinalVerdict(false);
        setPlaying(true);
        return;
      }
      setPlaying((current) => !current);
      return;
    }

    if (audioState === "idle" || audioState === "error") {
      await generateAudio();
      return;
    }

    const audio = audioRef.current;
    if (!audio || audioState !== "ready") return;

    if (audio.paused) {
      try {
        await audio.play();
      } catch {
        setAudioError("Your browser blocked playback. Press Play voices again.");
      }
    } else {
      audio.pause();
    }
  }

  function seekToTurn(index: number) {
    const nextIndex = Math.max(0, Math.min(index, script.turns.length - 1));
    setTurnIndex(nextIndex);
    setShowFinalVerdict(false);

    if (playbackMode === "default") return;

    const audio = audioRef.current;
    if (audio && Number.isFinite(audio.duration)) {
      audio.currentTime = turnTimeline[nextIndex].start * audio.duration;
      setAudioProgress(turnTimeline[nextIndex].start);
    }
  }

  function moveTurn(direction: -1 | 1) {
    seekToTurn(turnIndex + direction);
  }

  function restart() {
    setShowFinalVerdict(false);
    seekToTurn(0);

    if (playbackMode === "default") {
      setPlaying(true);
      return;
    }

    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    setPlaying(false);
    setAudioProgress(0);
  }

  function syncTurnToAudio() {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(audio.duration) || audio.duration <= 0) return;

    const progress = audio.currentTime / audio.duration;
    setAudioProgress(progress);
    const activeIndex = turnTimeline.findIndex((entry) => progress < entry.end);
    setTurnIndex(activeIndex >= 0 ? activeIndex : script.turns.length - 1);
  }

  const audioButtonLabel =
    playbackMode === "default"
      ? playing
        ? "Pause"
        : "Play"
      : audioState === "generating"
        ? "Rendering Drama 3..."
        : audioState === "ready"
          ? playing
            ? "Pause voices"
            : "Play voices"
          : audioState === "error"
            ? "Retry voices"
            : "Generate voices";

  return (
    <div className="stage-shell code-scroll flex h-full min-h-0 w-full flex-col gap-1.5 overflow-y-auto text-[#172138]">
      {playbackMode === "generated" && (
        <audio
          ref={audioRef}
          src={audioUrl ?? undefined}
          preload="metadata"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onTimeUpdate={syncTurnToAudio}
          onEnded={() => {
            setPlaying(false);
            setAudioProgress(1);
            setTurnIndex(script.turns.length - 1);
            setShowFinalVerdict(true);
            if (!playbackFinishedRef.current) {
              playbackFinishedRef.current = true;
              onPlaybackFinished?.();
            }
          }}
        />
      )}

      <header className="flex shrink-0 flex-wrap items-center justify-between gap-2 rounded-lg border border-[#172138]/25 bg-white/70 px-3 py-2 sm:px-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#172138] text-lg text-white" aria-hidden="true">◉</span>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-bold leading-tight sm:text-base">{repositoryLabel}</h1>
            <p className="truncate text-[10px] text-[#566078]">{repositoryUrl}</p>
          </div>
          <span className="hidden h-8 border-l border-[#172138]/25 sm:block" />
          <div className="hidden items-center gap-2 sm:flex">
            <span className="size-2 rounded-full bg-red-500" />
            <div>
              <p className="text-[10px] font-bold tracking-[0.14em] text-[#d74b42] uppercase">Live repository roast</p>
              <p className="text-[8px] tracking-[0.15em] text-[#566078] uppercase">
                {playbackMode === "default" ? "Local stage · no APIs" : "Audio generation"}
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button type="button" onClick={onBack} className="stage-control">▤ <span className="hidden sm:inline">Raw context</span></button>
          <button type="button" onClick={copyScript} className="stage-control">{copied ? "Copied" : "{} Copy script JSON"}</button>
          <button type="button" onClick={onReset} className="stage-control stage-control-blue">＋ <span className="hidden sm:inline">New repo</span></button>
        </div>
      </header>

      <section className="stage-scene relative min-h-[300px] flex-1 overflow-hidden rounded-lg border-2 border-[#172138] sm:min-h-[330px]" aria-label="Debate stage">
        <div className="stage-truss" aria-hidden="true" />
        <div className="spotlight spotlight-left" aria-hidden="true" />
        <div className="spotlight spotlight-right" aria-hidden="true" />

        <div className="absolute top-2 left-1/2 z-10 w-[min(86%,780px)] -translate-x-1/2 text-center">
          <p className="-rotate-1 text-[9px] font-bold tracking-[0.25em] text-[#ffbc72] uppercase sm:text-[10px]">
            {turn.phase ? phaseLabels[turn.phase] : "Local stage rehearsal"}
          </p>
          <div className="stage-logo mt-0.5 text-3xl font-black tracking-[-0.08em] sm:text-5xl lg:text-6xl">SILICON VALID</div>
        </div>

        <div className="absolute top-[74px] left-1/2 z-30 w-[min(84%,650px)] -translate-x-1/2 sm:top-[82px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={turn.id ?? turnIndex}
              initial={{ opacity: 0, y: 12, scale: 0.96, rotate: -0.6 }}
              animate={{ opacity: 1, y: 0, scale: 1, rotate: turnIndex % 2 ? 0.4 : -0.25 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: reduceMotion ? 0 : 0.28 }}
              className={`speech-bubble bubble-tail-${turn.bubbleSide ?? "center"} text-[#151824]`}
              aria-live="polite"
            >
              <div className="mb-1 flex items-center justify-between gap-3 border-b border-dashed border-[#192035]/25 pb-1">
                <p className="text-[10px] font-black tracking-wide uppercase sm:text-xs">{speaker?.name ?? turn.speakerName}</p>
                <span className="text-[8px] font-bold tracking-[0.1em] text-[#c13b31] uppercase sm:text-[9px]">{speaker?.role}</span>
              </div>
              <p className="max-h-[78px] overflow-hidden text-xs leading-snug font-bold sm:text-sm">{turn.displayText}</p>
              {(turn.evidence?.length ?? 0) > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {turn.evidence?.slice(0, 3).map((item) => (
                    <span key={item} className="rounded-full border border-[#3769e8]/35 bg-[#e8efff] px-1.5 py-0.5 font-mono text-[8px] text-[#28458e]">{item}</span>
                  ))}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="stage-floor absolute inset-x-0 bottom-0 z-20 h-[38%]" aria-hidden="true" />
        <div className="code-scroll absolute inset-x-0 bottom-8 z-30 overflow-x-auto px-2 sm:bottom-9 sm:px-6">
          <div className="mx-auto grid min-w-[540px] max-w-5xl grid-cols-5 items-end gap-1 sm:min-w-0 sm:gap-2">
            {cast.map((member) => {
              const active = member.id === turn.speakerId;
              return (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => {
                    const nextTurn = script.turns.findIndex((item, index) => index > turnIndex && item.speakerId === member.id);
                    const firstTurn = script.turns.findIndex((item) => item.speakerId === member.id);
                    seekToTurn(nextTurn >= 0 ? nextTurn : firstTurn);
                  }}
                  className={`group flex flex-col items-center outline-none ${active ? "z-20" : "z-10"}`}
                  aria-label={`Jump to ${member.name}'s next turn`}
                >
                  <CharacterPortrait
                    id={member.id}
                    active={active}
                    speaking={active && playing}
                    gesture={active ? turn.gesture : undefined}
                    reduceMotion={reduceMotion}
                  />
                  <span className={`mt-0.5 rounded-full border px-2 py-0.5 text-[8px] font-black tracking-wider uppercase transition sm:text-[9px] ${active ? "border-[#ffca70] bg-[#ff473d] text-white" : "border-white/30 bg-[#11182b]/90 text-white/65"}`}>{member.name.split(" ")[0]}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="audience-row absolute inset-x-0 bottom-0 z-40 h-10" aria-hidden="true" />
      </section>

      <div className="flex shrink-0 flex-wrap items-center gap-1.5 rounded-lg border border-[#172138]/20 bg-white/55 px-2 py-1.5 sm:flex-nowrap sm:px-3">
        <button type="button" onClick={() => moveTurn(-1)} disabled={turnIndex === 0} className="stage-control">◀ Previous</button>
        <button
          type="button"
          onClick={togglePlayback}
          disabled={audioState === "generating"}
          className="stage-control stage-control-gold min-w-24 disabled:cursor-wait disabled:opacity-60"
          aria-pressed={playing}
        >
          {playing ? "Ⅱ " : "▶ "}{audioButtonLabel}
        </button>
        <button type="button" onClick={() => moveTurn(1)} disabled={turnIndex === script.turns.length - 1} className="stage-control">Next ▶</button>
        <button type="button" onClick={restart} className="stage-control hidden sm:block">↻ Restart</button>
        <div className="min-w-24 flex-1 px-1">
          <div className="h-2 overflow-hidden rounded-full bg-[#172138]/15">
            <motion.div
              className="h-full rounded-full bg-[#ff9d37]"
              animate={{ width: `${playbackMode === "generated" && audioState === "ready" ? audioProgress * 100 : ((turnIndex + 1) / script.turns.length) * 100}%` }}
            />
          </div>
        </div>
        <span className="shrink-0 font-mono text-[10px] text-[#566078]">{turnIndex + 1} / {script.turns.length}</span>
        <button type="button" onClick={() => setShowTranscript((current) => !current)} className="stage-control">
          {showTranscript ? "Transcript ▾" : "Transcript"}
        </button>
        {audioUrl && playbackMode === "generated" && (
          <a href={audioUrl} download={`${repositoryLabel.replace("/", "-")}-roast.mp3`} className="stage-control hidden lg:inline-flex">MP3</a>
        )}
      </div>

      {audioError && (
        <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} role="alert" className="shrink-0 rounded-md border border-[#b9342e]/40 bg-[#fff0ea] px-3 py-1.5 text-xs font-bold text-[#9e2f2a]">
          <span>{audioError}</span>
          <button type="button" onClick={() => setAudioError(null)} className="ml-3" aria-label="Dismiss audio error">×</button>
        </motion.div>
      )}

      <div className="grid min-h-[110px] shrink-0 gap-1.5 lg:min-h-[126px] lg:flex-1 lg:grid-cols-[1.65fr_1fr]">
        {showTranscript && (
          <section className="code-scroll min-h-[110px] overflow-y-auto rounded-lg border border-[#172138]/20 bg-white/55 px-2 py-1.5 lg:min-h-0" aria-label="Debate transcript">
            <h2 className="mb-1 flex items-center gap-2 px-1 text-sm font-bold"><span>Transcript</span><span className="text-xs text-[#f29121]">✳</span></h2>
            <div className="space-y-0.5">
              {script.turns.map((item, index) => {
                const member = script.cast.find((candidate) => candidate.id === item.speakerId);
                return (
                  <button
                    key={item.id ?? `${item.speakerId}-${index}`}
                    type="button"
                    onClick={() => seekToTurn(index)}
                    className={`grid w-full grid-cols-[76px_1fr] gap-2 rounded px-2 py-1 text-left text-[10px] leading-tight transition sm:grid-cols-[92px_1fr] ${index === turnIndex ? "bg-[#dce7ff] text-[#172138]" : "text-[#566078] hover:bg-white/80"}`}
                  >
                    <span className="truncate font-bold tracking-wide text-[#3769e8] uppercase">{member?.name ?? item.speakerName}</span>
                    <span className="line-clamp-2">{item.displayText}</span>
                  </button>
                );
              })}
            </div>
            {showFinalVerdict && (
              <div className="mt-2 border-t border-[#172138]/15 px-2 pt-2 text-xs" aria-live="assertive">
                <strong>{verdictLabel} · {score.toFixed(1)}/10</strong> — {verdictSummary}
              </div>
            )}
          </section>
        )}

        <section className="min-h-[110px] rounded-lg border border-[#172138]/20 bg-white/55 px-3 py-2 lg:min-h-0" aria-label="Performance direction">
          <h2 className="mb-1 text-sm font-bold">▰ Performance Direction</h2>
          <div className="grid gap-1 text-[10px] leading-tight sm:grid-cols-3 lg:grid-cols-1">
            <p><strong className="mr-2 text-[#f29121]">● Tone</strong>{turn.mood?.replaceAll("-", " ") ?? "thoughtful and measured"}</p>
            <p><strong className="mr-2 text-[#3769e8]">● Body language</strong>{turn.gesture?.replaceAll("_", " ") ?? "open hands, calm posture"}</p>
            <p><strong className="mr-2 text-[#873cf5]">● Stage focus</strong>{speaker?.name ?? turn.speakerName} · {turn.phase ? phaseLabels[turn.phase] : "Center stage"}</p>
          </div>
          <details className="mt-1 border-t border-dashed border-[#172138]/15 pt-1 text-[9px]">
            <summary className="cursor-pointer font-bold text-[#566078]">Full direction</summary>
            <p className="mt-1 max-h-16 overflow-y-auto font-mono leading-relaxed text-[#566078]">{turn.fishText}</p>
          </details>
        </section>
      </div>

      <footer className="flex shrink-0 flex-wrap items-center justify-between gap-2 rounded-lg border border-[#172138]/15 bg-white/60 px-2 py-1.5 sm:px-3">
        <div className="flex items-center gap-2">
          <span className="text-lg text-[#3769e8]" aria-hidden="true">♧</span>
          <div>
            <p className="text-xs font-bold text-[#3769e8]">What&apos;s next?</p>
            <p className="hidden text-[9px] text-[#566078] sm:block">Turn insights from this debate into action.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button type="button" onClick={onGenerateFixPlan} className="stage-control stage-control-blue">⚒ Generate parallel fix plan</button>
          <button type="button" onClick={downloadTranscript} className="stage-control">▤ Export transcript</button>
          <a href={repositoryUrl} target="_blank" rel="noreferrer" className="stage-control">◉ Open in GitHub</a>
        </div>
      </footer>

      {showFinalVerdict && (
        <AnimatePresence>
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="shrink-0 rounded-lg border border-[#d74b42]/40 bg-[#fff0ea] px-4 py-2 text-center text-xs"
            aria-live="assertive"
          >
            <strong className="text-[#d74b42]">{verdictLabel} · {score.toFixed(1)} / 10</strong>
            <span className="ml-2">{playbackMode === "default" ? "The fundamentals are there. The architecture needs therapy." : verdictSummary}</span>
          </motion.section>
        </AnimatePresence>
      )}
    </div>
  );
}
