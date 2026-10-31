"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import type { RoastGesture, SiliconValidScript, SpeakerId, StagePosition } from "@/types/script";

type PlaybackMode = "generated" | "default";

type RoastStageProps = {
  script: SiliconValidScript;
  playbackMode: PlaybackMode;
  onBack: () => void;
  onReset: () => void;
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

export function SiliconValidStage({ script, playbackMode, onBack, onReset, onPlaybackStarted, onPlaybackFinished }: RoastStageProps) {
  const reduceMotion = Boolean(useReducedMotion());
  const audioRef = useRef<HTMLAudioElement>(null);
  const playbackStartedRef = useRef(false);
  const playbackFinishedRef = useRef(false);
  const [turnIndex, setTurnIndex] = useState(0);
  const [playing, setPlaying] = useState(playbackMode === "default");
  const [showTranscript, setShowTranscript] = useState(false);
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
        throw new Error(payload?.error ?? "Fish Audio could not render the performance.");
      }

      const blob = await response.blob();
      if (!blob.size) throw new Error("Fish Audio returned an empty audio file.");

      const nextUrl = URL.createObjectURL(blob);
      setAudioUrl(nextUrl);
      setAudioState("ready");
      setAudioProgress(0);
      setTurnIndex(0);
      setShowFinalVerdict(false);
    } catch (caught) {
      setAudioState("error");
      setAudioError(caught instanceof Error ? caught.message : "Fish Audio could not render the performance.");
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
    <div className="stage-shell code-scroll h-full min-h-0 w-full overflow-y-auto rounded-[18px] border-[3px] border-[#111827] bg-[#080b18] text-white shadow-[5px_6px_0_#111827]">
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

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/15 bg-[#0f1529]/95 px-4 py-3 sm:px-5">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[10px] font-bold tracking-[0.2em] text-[#ffb45d] uppercase">Live repository roast</p>
            <span className="rounded-full border border-[#57d4c4]/40 bg-[#57d4c4]/10 px-2 py-0.5 text-[9px] font-black tracking-wider text-[#7ee9dc] uppercase">
              {playbackMode === "default" ? "Local fallback · no APIs" : "Fish Audio Drama 3"}
            </span>
          </div>
          <h1 className="mt-0.5 text-lg font-bold tracking-tight sm:text-2xl">{repositoryLabel}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onBack} className="stage-control">Raw context</button>
          <button type="button" onClick={copyScript} className="stage-control stage-control-gold">{copied ? "Copied" : "Copy script JSON"}</button>
          <button type="button" onClick={onReset} className="stage-control">New repo</button>
        </div>
      </div>

      <div className="stage-scene relative min-h-[520px] overflow-hidden sm:min-h-[600px]">
        <div className="stage-truss" aria-hidden="true" />
        <div className="spotlight spotlight-left" aria-hidden="true" />
        <div className="spotlight spotlight-right" aria-hidden="true" />

        <div className="absolute top-10 left-1/2 z-10 w-[min(86%,780px)] -translate-x-1/2 text-center sm:top-12">
          <p className="-rotate-1 text-[10px] font-bold tracking-[0.3em] text-[#ffbc72] uppercase sm:text-xs">
            {turn.phase ? phaseLabels[turn.phase] : "Local stage rehearsal"}
          </p>
          <div className="stage-logo mt-1 text-4xl font-black tracking-[-0.08em] sm:text-6xl lg:text-7xl">SILICON VALID</div>
        </div>

        <div className="absolute top-[135px] left-1/2 z-30 w-[min(88%,760px)] -translate-x-1/2 sm:top-[155px]">
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
              <div className="mb-2 flex items-center justify-between gap-3 border-b-2 border-dashed border-[#192035]/20 pb-2">
                <p className="text-sm font-black tracking-wide uppercase sm:text-base">{speaker?.name ?? turn.speakerName}</p>
                <span className="text-[9px] font-bold tracking-[0.14em] text-[#c13b31] uppercase sm:text-[10px]">{speaker?.role}</span>
              </div>
              <p className="text-base leading-relaxed font-bold sm:text-xl">{turn.displayText}</p>
              {(turn.evidence?.length ?? 0) > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {turn.evidence?.map((item) => (
                    <span key={item} className="rounded-full border border-[#3769e8]/35 bg-[#e8efff] px-2 py-1 font-mono text-[9px] text-[#28458e] sm:text-[10px]">{item}</span>
                  ))}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="stage-floor absolute inset-x-0 bottom-0 z-20 h-[215px] sm:h-[250px]" aria-hidden="true" />
        <div className="code-scroll absolute inset-x-0 bottom-14 z-30 overflow-x-auto px-3 sm:bottom-16 sm:px-7">
          <div className="mx-auto grid min-w-[720px] max-w-5xl grid-cols-5 items-end gap-2">
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
                  <span className={`mt-1 rounded-full border-2 px-2 py-1 text-[9px] font-black tracking-wider uppercase transition sm:text-[10px] ${active ? "border-[#ffca70] bg-[#ff473d] text-white" : "border-white/20 bg-[#11182b]/90 text-white/45"}`}>{member.name.split(" ")[0]}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="audience-row absolute inset-x-0 bottom-0 z-40 h-20" aria-hidden="true" />
      </div>

      <AnimatePresence>
        {showFinalVerdict && (
          <motion.section
            initial={{ opacity: 0, y: 18, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10 }}
            className="mx-4 mt-4 rounded-[18px_22px_17px_24px] border-2 border-[#ffbd64] bg-[#291729] px-5 py-6 text-center shadow-[4px_5px_0_#ff473d] sm:mx-5"
            aria-live="assertive"
          >
            <p className="text-xs font-black tracking-[0.28em] text-[#ffca70] uppercase">Final verdict</p>
            <p className="mt-2 text-5xl font-black text-white">{score.toFixed(1)} <span className="text-2xl text-white/60">/ 10</span></p>
            <p className="mt-2 text-xl font-black tracking-[0.16em] text-[#ff756c] uppercase">{verdictLabel}</p>
            <p className="mx-auto mt-4 max-w-xl text-lg leading-relaxed font-bold text-white/90">
              {playbackMode === "default" ? (
                <>&ldquo;The fundamentals are there.<br />The architecture needs therapy.&rdquo;</>
              ) : (
                verdictSummary
              )}
            </p>
          </motion.section>
        )}
      </AnimatePresence>

      <div className="border-t border-white/15 bg-[#10162a] px-4 py-3 sm:px-5">
        {audioError && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} role="alert" className="mb-3 flex items-start justify-between gap-3 rounded-lg border border-[#ff756c]/60 bg-[#ff473d]/10 px-3 py-2 text-xs font-bold text-[#ffaaa4]">
            <span>{audioError}</span>
            <button type="button" onClick={() => setAudioError(null)} aria-label="Dismiss audio error">x</button>
          </motion.div>
        )}

        <div className="mb-3 rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-center" aria-live="polite">
          <span className="mr-2 text-[10px] font-black tracking-wider text-[#ffbd64] uppercase">{speaker?.name ?? turn.speakerName}</span>
          <span className="text-xs leading-relaxed text-white/80">{turn.displayText}</span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => moveTurn(-1)} disabled={turnIndex === 0} className="stage-control disabled:cursor-not-allowed disabled:opacity-35">&#9198; Previous</button>
          <button
            type="button"
            onClick={togglePlayback}
            disabled={audioState === "generating"}
            className="stage-control stage-control-gold min-w-32 disabled:cursor-wait disabled:opacity-60"
            aria-pressed={playing}
          >
            {playing ? "⏸ " : "▶ "}{audioButtonLabel}
          </button>
          <button type="button" onClick={() => moveTurn(1)} disabled={turnIndex === script.turns.length - 1} className="stage-control disabled:cursor-not-allowed disabled:opacity-35">Next &#9197;</button>
          <button type="button" onClick={restart} className="stage-control">Restart</button>
          <div className="min-w-36 flex-1">
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <motion.div
                className="h-full bg-[linear-gradient(90deg,#ff473d,#ffbd64)]"
                animate={{ width: `${playbackMode === "generated" && audioState === "ready" ? audioProgress * 100 : ((turnIndex + 1) / script.turns.length) * 100}%` }}
              />
            </div>
          </div>
          <span className="font-mono text-xs text-white/60">{turnIndex + 1} / {script.turns.length}</span>
          {audioUrl && playbackMode === "generated" && (
            <a href={audioUrl} download={`${repositoryLabel.replace("/", "-")}-roast.mp3`} className="stage-control">Download MP3</a>
          )}
          <button type="button" onClick={() => setShowTranscript((current) => !current)} className="stage-control">{showTranscript ? "Hide transcript" : "Transcript"}</button>
        </div>

        <p className="mt-2 text-[10px] leading-relaxed text-white/45">
          {playbackMode === "default" && "Local rehearsal mode: timing, subtitles, gestures and turn changes run entirely in your browser."}
          {playbackMode === "generated" && audioState === "idle" && "Generate voices makes one five-speaker Drama 3 API call and uses Fish Audio credits."}
          {playbackMode === "generated" && audioState === "generating" && "Directing five voices in one performance. Longer scripts can take a minute."}
          {playbackMode === "generated" && audioState === "ready" && "Voice playback is ready. The visible turn follows the generated performance."}
          {playbackMode === "generated" && audioState === "error" && "No credits are spent by retrying until Fish Audio accepts the request."}
        </p>

        <details className="mt-3 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-white/70">
          <summary className="cursor-pointer font-bold tracking-wider text-[#ffca70] uppercase">Performance direction</summary>
          <p className="mt-2 font-mono leading-relaxed">{turn.fishText}</p>
        </details>

        <AnimatePresence>
          {showTranscript && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="code-scroll mt-3 max-h-64 space-y-2 overflow-y-auto border-t border-white/10 pt-3"
            >
              {script.turns.map((item, index) => {
                const member = script.cast.find((candidate) => candidate.id === item.speakerId);
                return (
                  <button
                    key={item.id ?? `${item.speakerId}-${index}`}
                    type="button"
                    onClick={() => seekToTurn(index)}
                    className={`block w-full rounded-lg border px-3 py-2 text-left transition ${index === turnIndex ? "border-[#ffbd64] bg-[#ffbd64]/10" : "border-white/10 bg-white/[0.03] hover:bg-white/[0.07]"}`}
                  >
                    <span className="mr-2 text-[10px] font-black tracking-wider text-[#ff7a61] uppercase">{member?.name ?? item.speakerName}</span>
                    <span className="text-xs leading-relaxed text-white/75">{item.displayText}</span>
                  </button>
                );
              })}
              <div className="rounded-xl border-2 border-[#ffbd64]/50 bg-[#ffbd64]/10 p-4">
                <p className="text-xs font-black tracking-[0.18em] text-[#ffca70] uppercase">Final board notes - {score.toFixed(1)}/10</p>
                <p className="mt-2 text-xs leading-relaxed text-white/75">{verdictSummary}</p>
                {script.verdict && (
                  <div className="mt-2 grid gap-2 text-xs leading-relaxed text-white/75 sm:grid-cols-2">
                    <p><strong className="text-white">Strength:</strong> {script.verdict.biggestStrength}</p>
                    <p><strong className="text-white">Problem:</strong> {script.verdict.biggestProblem}</p>
                    <p><strong className="text-white">Fix first:</strong> {script.verdict.fixFirst}</p>
                    <p><strong className="text-white">Verdict:</strong> {script.verdict.siliconValidVerdict}</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
