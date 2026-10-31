"use client";

import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { DEFAULT_ROAST_SCRIPT } from "@/lib/default-roast";
import { clearRepositoryContextCache, fetchRepositoryContext } from "@/lib/repository-client";
import type { RepositoryContext } from "@/types/repository";
import type { SiliconValidScript } from "@/types/script";
import { SiliconValidStage } from "./roast-stage";
import { SiliconShell } from "./silicon-shell";

type Screen = "loading" | "error" | "result" | "script-loading" | "stage";

const repositoryLoadingSteps = [
  "GitHub Repo URL",
  "Repository Analyzer",
  "Fetching repository...",
  "Reading file tree...",
  "Inspecting package files...",
  "Reading README...",
  "Collecting GitHub metadata...",
  "Structured Repo Context",
];

const scriptLoadingSteps = [
  "Routing evidence to the right reviewer...",
  "Seating all five panelists...",
  "Starting the technical autopsy...",
  "Letting Dinesh and Gilfoyle fight...",
  "Writing Fish Audio directions...",
  "Preparing the final verdict...",
];

const screenMotion = {
  initial: { opacity: 0, y: 20, scale: 0.985 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -16, scale: 0.985 },
  transition: { duration: 0.38, ease: [0.22, 1, 0.36, 1] as const },
};

function ProgressiveLoading({ steps, visible }: { steps: string[]; visible: number }) {
  return (
    <div className="flex flex-col items-center">
      {steps.slice(0, visible).map((step, index) => (
        <motion.div key={step} initial={{ opacity: 0, y: 8, rotate: index % 2 ? 1 : -1 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center">
          {index > 0 && <span className="my-0.5 text-lg leading-none text-[#3769e8]">&darr;</span>}
          <span className={`text-center text-sm font-bold sm:text-lg ${index === visible - 1 ? "text-[#3769e8]" : "text-[#172138]/65"}`}>{step}</span>
        </motion.div>
      ))}
      <div className="mx-auto mt-6 h-2 w-52 overflow-hidden rounded-full border-2 border-[#172138] bg-white">
        <motion.div className="h-full bg-[#3769e8]" animate={{ width: `${(visible / steps.length) * 100}%` }} transition={{ type: "spring", stiffness: 120, damping: 18 }} />
      </div>
    </div>
  );
}

export function RepositoryDebate({ repoUrl }: { repoUrl: string }) {
  const router = useRouter();
  const [screen, setScreen] = useState<Screen>("loading");
  const [context, setContext] = useState<RepositoryContext | null>(null);
  const [script, setScript] = useState<SiliconValidScript | null>(null);
  const [playbackMode, setPlaybackMode] = useState<"generated" | "default">("generated");
  const [error, setError] = useState<string | null>(null);
  const [scriptError, setScriptError] = useState<string | null>(null);
  const [visibleSteps, setVisibleSteps] = useState(1);
  const [scriptVisibleSteps, setScriptVisibleSteps] = useState(1);
  const [copied, setCopied] = useState(false);
  const [repositoryAttempt, setRepositoryAttempt] = useState(0);

  const json = useMemo(() => (context ? JSON.stringify(context, null, 2) : ""), [context]);

  useEffect(() => {
    let isCurrentAttempt = true;

    const minimumLoadingTime = new Promise((resolve) => window.setTimeout(resolve, (repositoryLoadingSteps.length - 1) * 470 + 300));

    void Promise.all([fetchRepositoryContext(repoUrl), minimumLoadingTime])
      .then(([repositoryContext]) => {
        if (!isCurrentAttempt) return;
        setContext(repositoryContext);
        setScreen("result");
      })
      .catch((caught: unknown) => {
        if (!isCurrentAttempt) return;
        setError(caught instanceof Error ? caught.message : "Something went sideways.");
        setScreen("error");
      });

    return () => {
      isCurrentAttempt = false;
    };
  }, [repoUrl, repositoryAttempt]);

  useEffect(() => {
    if (screen !== "loading" || visibleSteps >= repositoryLoadingSteps.length) return;
    const timer = window.setTimeout(() => setVisibleSteps((current) => current + 1), 470);
    return () => window.clearTimeout(timer);
  }, [screen, visibleSteps]);

  useEffect(() => {
    if (screen !== "script-loading" || scriptVisibleSteps >= scriptLoadingSteps.length) return;
    const timer = window.setTimeout(() => setScriptVisibleSteps((current) => current + 1), 650);
    return () => window.clearTimeout(timer);
  }, [screen, scriptVisibleSteps]);

  async function generateScript() {
    if (!context) return;

    setScriptError(null);
    setScriptVisibleSteps(1);
    setScreen("script-loading");
    const minimumLoadingTime = new Promise((resolve) => window.setTimeout(resolve, (scriptLoadingSteps.length - 1) * 650 + 350));

    try {
      const responsePromise = fetch("/api/script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repositoryContext: context }),
      });
      const [response] = await Promise.all([responsePromise, minimumLoadingTime]);
      const payload = await response.json();

      if (!response.ok) throw new Error(payload.error ?? "The panel refused to take the stage.");

      setScript(payload as SiliconValidScript);
      setPlaybackMode("generated");
      setScreen("stage");
    } catch (caught) {
      setScriptError(caught instanceof Error ? caught.message : "The script could not be generated.");
      setScreen("result");
    }
  }

  function playDefaultRoast() {
    setScriptError(null);
    setScript(DEFAULT_ROAST_SCRIPT);
    setPlaybackMode("default");
    setScreen("stage");
  }

  async function copyJson() {
    try {
      await navigator.clipboard.writeText(json);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  function goHome() {
    router.push("/");
  }

  function retryRepository() {
    clearRepositoryContextCache(repoUrl);
    setScreen("loading");
    setVisibleSteps(1);
    setContext(null);
    setScript(null);
    setError(null);
    setScriptError(null);
    setRepositoryAttempt((current) => current + 1);
  }

  const isStage = screen === "stage";

  return (
    <SiliconShell
      isStage={isStage}
      fullscreen
      onLogoClick={goHome}
      backControl={
        <button type="button" onClick={goHome} className="text-xs font-bold text-[#3769e8] underline decoration-wavy underline-offset-4">
          &larr; Try another repo
        </button>
      }
    >
      <AnimatePresence mode="wait">
        {screen === "loading" && (
          <motion.div key="loading" {...screenMotion} className="w-full max-w-xl text-center" aria-live="polite">
            <p className="mb-5 rotate-1 text-xs font-bold tracking-[0.24em] text-[#d74b42] uppercase">following the wires...</p>
            <ProgressiveLoading steps={repositoryLoadingSteps} visible={visibleSteps} />
          </motion.div>
        )}

        {screen === "error" && (
          <motion.div key="error" {...screenMotion} className="w-full max-w-xl text-center" role="alert">
            <p className="text-xs font-bold tracking-[0.22em] text-[#d74b42] uppercase">Repository analysis failed</p>
            <h1 className="mt-3 text-3xl font-bold text-[#172138] sm:text-5xl">The wires got crossed.</h1>
            <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-[#9e2f2a] sm:text-base">{error}</p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <button type="button" onClick={retryRepository} className="sketch-button bg-[#d74b42] px-6 py-3 font-bold text-white">Retry fetch</button>
              <button type="button" onClick={goHome} className="sketch-button bg-[#3769e8] px-6 py-3 font-bold text-white">Go Back</button>
            </div>
          </motion.div>
        )}

        {screen === "script-loading" && (
          <motion.div key="script-loading" {...screenMotion} className="w-full max-w-xl text-center" aria-live="polite">
            <p className="mb-2 text-4xl" aria-hidden="true">&#x1F3AD;</p>
            <p className="mb-5 rotate-1 text-xs font-bold tracking-[0.24em] text-[#d74b42] uppercase">the panel is reading your code...</p>
            <ProgressiveLoading steps={scriptLoadingSteps} visible={scriptVisibleSteps} />
            <p className="mt-5 text-xs text-[#667087]">Evidence first. Insults second. This can take a minute.</p>
          </motion.div>
        )}

        {screen === "result" && context && (
          <motion.div key="result" {...screenMotion} className="flex h-full min-h-0 w-full flex-col">
            <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="mb-1 text-xs font-bold tracking-[0.19em] text-[#2f7a4e] uppercase sm:text-sm">Repository analysis complete</p>
                <h1 className="break-all text-2xl leading-tight font-bold text-[#172138] sm:text-4xl">{context.repository.owner}/{context.repository.name}</h1>
                <p className="mt-2 text-xs font-bold tracking-[0.16em] text-[#d74b42] uppercase">Raw fetched response</p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-3">
                <button type="button" onClick={generateScript} className="sketch-button bg-[#d74b42] px-5 py-2 text-sm font-bold text-white">Generate Roast Script -&gt;</button>
                <button type="button" onClick={playDefaultRoast} className="sketch-button bg-[#172138] px-5 py-2 text-sm font-bold text-white">&#9654; Play Default Roast</button>
                <button type="button" onClick={copyJson} className="sketch-button bg-[#f6c453] px-4 py-2 text-sm font-bold text-[#172138]">{copied ? "Copied" : "Copy JSON"}</button>
                <button type="button" onClick={goHome} className="sketch-button bg-[#3769e8] px-4 py-2 text-sm font-bold text-white">Another repo</button>
              </div>
            </div>
            {scriptError && (
              <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} role="alert" className="mb-3 flex items-start justify-between gap-3 rounded-lg border-2 border-[#b9342e] bg-[#fff0ea] px-3 py-2 text-sm font-bold text-[#9e2f2a]">
                <span>x {scriptError}</span>
                <button type="button" onClick={() => setScriptError(null)} aria-label="Dismiss error">x</button>
              </motion.div>
            )}
            {script && (
              <button type="button" onClick={() => setScreen("stage")} className="mb-3 self-start text-sm font-bold text-[#3769e8] underline decoration-wavy underline-offset-4">Return to stage -&gt;</button>
            )}
            <div className="sketch-box min-h-0 flex-1 overflow-hidden bg-[#111a2b] p-1">
              <pre className="code-scroll h-full max-h-[52dvh] overflow-auto p-4 font-mono text-[11px] leading-relaxed text-[#dce7ff] sm:p-5 sm:text-xs lg:text-sm"><code>{json}</code></pre>
            </div>
          </motion.div>
        )}

        {screen === "stage" && script && (
          <motion.div key="stage" {...screenMotion} className="h-full min-h-0 w-full">
            <SiliconValidStage script={script} playbackMode={playbackMode} onBack={() => setScreen("result")} onReset={goHome} />
          </motion.div>
        )}
      </AnimatePresence>
    </SiliconShell>
  );
}

