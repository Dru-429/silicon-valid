"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import type { RoastScript, SpeakerId, StagePosition } from "@/types/script";

type RoastStageProps = {
  script: RoastScript;
  onBack: () => void;
  onReset: () => void;
};

const positionOrder: Record<StagePosition, number> = {
  "far-left": 0,
  left: 1,
  center: 2,
  right: 3,
  "far-right": 4,
};

const characterLook: Record<SpeakerId, { accent: string; hair: string; initials: string; pose: string }> = {
  dinesh: { accent: "#64325f", hair: "#17131b", initials: "DK", pose: "-rotate-2" },
  gilfoyle: { accent: "#2c3442", hair: "#2d211e", initials: "BG", pose: "rotate-1" },
  richard: { accent: "#b52635", hair: "#a85f26", initials: "RH", pose: "-rotate-1" },
  jared: { accent: "#b67d46", hair: "#37231d", initials: "JD", pose: "rotate-1" },
  erlich: { accent: "#253552", hair: "#8a542e", initials: "EB", pose: "rotate-2" },
};

const phaseLabels = {
  "first-impression": "Act I - First impression",
  "technical-autopsy": "Act II - Technical autopsy",
  fight: "Act III - Everybody fights",
  "unexpected-praise": "Act IV - Unexpected praise",
  "final-verdict": "Finale - The verdict",
};

function CharacterPortrait({ id, active }: { id: SpeakerId; active: boolean }) {
  const look = characterLook[id];

  return (
    <motion.div
      className={`stage-character ${look.pose}`}
      animate={
        active
          ? { y: [0, -9, 0], scale: 1.05, rotate: id === "erlich" ? [2, -2, 2] : undefined }
          : { y: 0, scale: 0.92, opacity: 0.68 }
      }
      transition={active ? { duration: 0.65, ease: "easeOut" } : { duration: 0.25 }}
    >
      <div className="stage-hair" style={{ background: look.hair }} />
      <div className="stage-head">
        <span className="stage-eye" />
        <span className="stage-eye" />
        <span className="stage-mouth" />
      </div>
      <div className="stage-neck" />
      <div className="stage-body" style={{ background: look.accent }}>
        <span>{look.initials}</span>
      </div>
    </motion.div>
  );
}

export function RoastStage({ script, onBack, onReset }: RoastStageProps) {
  const prefersReducedMotion = useReducedMotion();
  const [turnIndex, setTurnIndex] = useState(0);
  const [playing, setPlaying] = useState(!prefersReducedMotion);
  const [showTranscript, setShowTranscript] = useState(false);
  const [copied, setCopied] = useState(false);

  const cast = useMemo(
    () => [...script.cast].sort((a, b) => positionOrder[a.stagePosition] - positionOrder[b.stagePosition]),
    [script.cast],
  );
  const turn = script.turns[turnIndex];
  const speaker = script.cast.find((member) => member.id === turn.speakerId);

  useEffect(() => {
    if (!playing || prefersReducedMotion) return;

    const timer = window.setInterval(() => {
      setTurnIndex((current) => (current + 1) % script.turns.length);
    }, 6500);
    return () => window.clearInterval(timer);
  }, [playing, prefersReducedMotion, script.turns.length]);

  async function copyScript() {
    try {
      await navigator.clipboard.writeText(JSON.stringify(script, null, 2));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  function moveTurn(direction: -1 | 1) {
    setPlaying(false);
    setTurnIndex((current) => (current + direction + script.turns.length) % script.turns.length);
  }

  return (
    <div className="stage-shell code-scroll h-full min-h-0 w-full overflow-y-auto rounded-[18px] border-[3px] border-[#111827] bg-[#080b18] text-white shadow-[5px_6px_0_#111827]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/15 bg-[#0f1529]/95 px-4 py-3 sm:px-5">
        <div>
          <p className="text-[10px] font-bold tracking-[0.2em] text-[#ffb45d] uppercase">Live repository roast</p>
          <h1 className="mt-0.5 text-lg font-bold tracking-tight sm:text-2xl">{script.repositoryLabel}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onBack} className="stage-control">Raw context</button>
          <button type="button" onClick={copyScript} className="stage-control stage-control-gold">
            {copied ? "Copied" : "Copy script JSON"}
          </button>
          <button type="button" onClick={onReset} className="stage-control">New repo</button>
        </div>
      </div>

      <div className="stage-scene relative min-h-[520px] overflow-hidden sm:min-h-[600px]">
        <div className="stage-truss" aria-hidden="true" />
        <div className="spotlight spotlight-left" aria-hidden="true" />
        <div className="spotlight spotlight-right" aria-hidden="true" />

        <div className="absolute top-10 left-1/2 z-10 w-[min(86%,780px)] -translate-x-1/2 text-center sm:top-12">
          <p className="-rotate-1 text-[10px] font-bold tracking-[0.3em] text-[#ffbc72] uppercase sm:text-xs">
            {phaseLabels[turn.phase]}
          </p>
          <div className="stage-logo mt-1 text-4xl font-black tracking-[-0.08em] sm:text-6xl lg:text-7xl">
            SILICON VALID
          </div>
        </div>

        <div className="absolute top-[135px] left-1/2 z-30 w-[min(88%,760px)] -translate-x-1/2 sm:top-[155px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={turnIndex}
              initial={{ opacity: 0, y: 12, scale: 0.96, rotate: -0.6 }}
              animate={{ opacity: 1, y: 0, scale: 1, rotate: turnIndex % 2 ? 0.4 : -0.25 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.28 }}
              className="speech-bubble text-[#151824]"
              aria-live="polite"
            >
              <div className="mb-2 flex items-center justify-between gap-3 border-b-2 border-dashed border-[#192035]/20 pb-2">
                <p className="text-sm font-black tracking-wide uppercase sm:text-base">{speaker?.name}</p>
                <span className="text-[9px] font-bold tracking-[0.14em] text-[#c13b31] uppercase sm:text-[10px]">
                  {speaker?.role}
                </span>
              </div>
              <p className="text-base leading-relaxed font-bold sm:text-xl">{turn.displayText}</p>
              {turn.evidence.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {turn.evidence.map((item) => (
                    <span key={item} className="rounded-full border border-[#3769e8]/35 bg-[#e8efff] px-2 py-1 font-mono text-[9px] text-[#28458e] sm:text-[10px]">
                      {item}
                    </span>
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
                    setTurnIndex(nextTurn >= 0 ? nextTurn : firstTurn);
                    setPlaying(false);
                  }}
                  className={`group flex flex-col items-center outline-none ${active ? "z-20" : "z-10"}`}
                  aria-label={`Jump to ${member.name}'s next turn`}
                >
                  <CharacterPortrait id={member.id} active={active} />
                  <span className={`mt-1 rounded-full border-2 px-2 py-1 text-[9px] font-black tracking-wider uppercase transition sm:text-[10px] ${active ? "border-[#ffca70] bg-[#ff473d] text-white" : "border-white/25 bg-[#11182b]/90 text-white/70"}`}>
                    {member.name.split(" ")[0]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="audience-row absolute inset-x-0 bottom-0 z-40 h-20" aria-hidden="true" />
      </div>

      <div className="border-t border-white/15 bg-[#10162a] px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => moveTurn(-1)} className="stage-icon-button" aria-label="Previous line">&larr;</button>
          <button
            type="button"
            onClick={() => setPlaying((current) => !current)}
            className="stage-control min-w-24"
            aria-pressed={playing}
          >
            {playing ? "Pause" : "Play"}
          </button>
          <button type="button" onClick={() => moveTurn(1)} className="stage-icon-button" aria-label="Next line">&rarr;</button>
          <div className="min-w-36 flex-1">
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <motion.div
                className="h-full bg-[linear-gradient(90deg,#ff473d,#ffbd64)]"
                animate={{ width: `${((turnIndex + 1) / script.turns.length) * 100}%` }}
              />
            </div>
          </div>
          <span className="font-mono text-xs text-white/60">{turnIndex + 1} / {script.turns.length}</span>
          <button type="button" onClick={() => setShowTranscript((current) => !current)} className="stage-control">
            {showTranscript ? "Hide transcript" : "Transcript"}
          </button>
        </div>

        <details className="mt-3 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-white/70">
          <summary className="cursor-pointer font-bold tracking-wider text-[#ffca70] uppercase">Fish Audio direction</summary>
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
                    key={`${item.speakerId}-${index}`}
                    type="button"
                    onClick={() => {
                      setTurnIndex(index);
                      setPlaying(false);
                    }}
                    className={`block w-full rounded-lg border px-3 py-2 text-left transition ${index === turnIndex ? "border-[#ffbd64] bg-[#ffbd64]/10" : "border-white/10 bg-white/[0.03] hover:bg-white/[0.07]"}`}
                  >
                    <span className="mr-2 text-[10px] font-black tracking-wider text-[#ff7a61] uppercase">{member?.name}</span>
                    <span className="text-xs leading-relaxed text-white/75">{item.displayText}</span>
                  </button>
                );
              })}
              <div className="rounded-xl border-2 border-[#ffbd64]/50 bg-[#ffbd64]/10 p-4">
                <p className="text-xs font-black tracking-[0.18em] text-[#ffca70] uppercase">Final board notes - {script.verdict.score}/100</p>
                <div className="mt-2 grid gap-2 text-xs leading-relaxed text-white/75 sm:grid-cols-2">
                  <p><strong className="text-white">Strength:</strong> {script.verdict.biggestStrength}</p>
                  <p><strong className="text-white">Problem:</strong> {script.verdict.biggestProblem}</p>
                  <p><strong className="text-white">Fix first:</strong> {script.verdict.fixFirst}</p>
                  <p><strong className="text-white">Verdict:</strong> {script.verdict.siliconValidVerdict}</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
