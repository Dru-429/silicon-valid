"use client";

import { AnimatePresence, motion } from "motion/react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import type { RepositoryContext } from "@/types/repository";
import type { RoastScript } from "@/types/script";
import { RoastStage } from "./roast-stage";

type Screen = "form" | "loading" | "result" | "script-loading" | "stage";

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
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 8, rotate: index % 2 ? 1 : -1 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center"
        >
          {index > 0 && <span className="my-0.5 text-lg leading-none text-[#3769e8]">&darr;</span>}
          <span className={`text-center text-sm font-bold sm:text-lg ${index === visible - 1 ? "text-[#3769e8]" : "text-[#172138]/65"}`}>
            {step}
          </span>
        </motion.div>
      ))}
      <div className="mx-auto mt-6 h-2 w-52 overflow-hidden rounded-full border-2 border-[#172138] bg-white">
        <motion.div
          className="h-full bg-[#3769e8]"
          animate={{ width: `${(visible / steps.length) * 100}%` }}
          transition={{ type: "spring", stiffness: 120, damping: 18 }}
        />
      </div>
    </div>
  );
}

export function RepositoryAnalyzer() {
  const [screen, setScreen] = useState<Screen>("form");
  const [repoUrl, setRepoUrl] = useState("");
  const [context, setContext] = useState<RepositoryContext | null>(null);
  const [script, setScript] = useState<RoastScript | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scriptError, setScriptError] = useState<string | null>(null);
  const [visibleSteps, setVisibleSteps] = useState(1);
  const [scriptVisibleSteps, setScriptVisibleSteps] = useState(1);
  const [copied, setCopied] = useState(false);

  const json = useMemo(() => (context ? JSON.stringify(context, null, 2) : ""), [context]);

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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!/^https:\/\/github\.com\/[^/]+\/[^/?#]+\/?(?:[?#].*)?$/.test(repoUrl.trim())) {
      setError("Draw me a full GitHub repository URL, like github.com/owner/repo.");
      return;
    }

    setVisibleSteps(1);
    setScreen("loading");
    const minimumLoadingTime = new Promise((resolve) =>
      window.setTimeout(resolve, (repositoryLoadingSteps.length - 1) * 470 + 300),
    );

    try {
      const responsePromise = fetch("/api/repository", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoUrl: repoUrl.trim() }),
      });
      const [response] = await Promise.all([responsePromise, minimumLoadingTime]);
      const payload = await response.json();

      if (!response.ok) throw new Error(payload.error ?? "The repository could not be fetched.");

      setContext(payload as RepositoryContext);
      setScreen("result");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went sideways.");
      setScreen("form");
    }
  }

  async function generateScript() {
    if (!context) return;

    setScriptError(null);
    setScriptVisibleSteps(1);
    setScreen("script-loading");
    const minimumLoadingTime = new Promise((resolve) =>
      window.setTimeout(resolve, (scriptLoadingSteps.length - 1) * 650 + 350),
    );

    try {
      const responsePromise = fetch("/api/script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repositoryContext: context }),
      });
      const [response] = await Promise.all([responsePromise, minimumLoadingTime]);
      const payload = await response.json();

      if (!response.ok) throw new Error(payload.error ?? "The panel refused to take the stage.");

      setScript(payload as RoastScript);
      setScreen("stage");
    } catch (caught) {
      setScriptError(caught instanceof Error ? caught.message : "The script could not be generated.");
      setScreen("result");
    }
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

  function reset() {
    setRepoUrl("");
    setContext(null);
    setScript(null);
    setError(null);
    setScriptError(null);
    setCopied(false);
    setScreen("form");
  }

  const isStage = screen === "stage";

  return (
    <main className="relative min-h-dvh overflow-hidden bg-[#152038] p-3 sm:p-6 lg:p-8">
      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url('/bg.png')" }} aria-hidden="true" />
      <div className="absolute inset-0 bg-[linear-gradient(130deg,rgba(7,15,32,.78),rgba(8,18,38,.68)_45%,rgba(13,20,31,.82))]" aria-hidden="true" />
      <div className={`relative mx-auto flex min-h-[calc(100dvh-1.5rem)] items-center justify-center sm:min-h-[calc(100dvh-3rem)] lg:min-h-[calc(100dvh-4rem)] ${isStage ? "max-w-[1500px]" : "max-w-6xl"}`}>
        <section className={`sketch-frame paper-noise flex max-h-[calc(100dvh-1.5rem)] min-h-[580px] w-full flex-col overflow-hidden px-5 py-7 sm:max-h-[calc(100dvh-3rem)] sm:min-h-[650px] sm:px-10 sm:py-9 lg:max-h-[calc(100dvh-4rem)] ${isStage ? "lg:px-7" : "lg:px-14"}`}>
          <header className="relative z-10 flex items-start justify-between gap-5 border-b-2 border-dashed border-[#3769e8]/45 pb-4">
            <button type="button" onClick={reset} className="group text-left" aria-label="Return to the start">
              <span className="block -rotate-1 text-3xl leading-none font-bold tracking-[-0.08em] text-[#3769e8] sm:text-5xl">Silicon Valid</span>
              <span className="mt-2 block rotate-[.3deg] text-[10px] font-bold tracking-[0.25em] text-[#566078] uppercase sm:text-xs">repository field notes / parts 01 + 02</span>
            </button>
            <span className="rotate-2 rounded-full border-2 border-[#3769e8] px-3 py-1 text-[10px] font-bold tracking-wider text-[#2349ac] uppercase sm:text-xs">
              {isStage ? "panel in session" : "repo roast theatre"}
            </span>
          </header>

          <div className="relative z-10 flex min-h-0 flex-1 items-center justify-center py-5 sm:py-8">
            <AnimatePresence mode="wait">
              {screen === "form" && (
                <motion.div key="form" {...screenMotion} className="w-full max-w-3xl">
                  <div className="mb-7 -rotate-[.4deg] text-center sm:mb-10">
                    <p className="mb-3 text-sm font-bold tracking-[0.22em] text-[#d74b42] uppercase">paste it. peek inside it. put it on stage.</p>
                    <h1 className="text-3xl leading-tight font-bold text-[#172138] sm:text-5xl lg:text-6xl">What&apos;s hiding in that repo?</h1>
                    <svg className="mx-auto mt-2 h-4 w-64 text-[#3769e8]" viewBox="0 0 260 16" aria-hidden="true">
                      <path d="M3 10C45 2 83 14 126 7s87 8 131-3" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                  </div>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <label htmlFor="repo-url" className="ml-2 block -rotate-1 text-lg font-bold sm:text-xl">GitHub Repo URL <span className="text-[#d74b42]">-&gt;</span></label>
                    <div className="flex flex-col gap-4 sm:flex-row">
                      <input
                        id="repo-url"
                        type="url"
                        value={repoUrl}
                        onChange={(event) => setRepoUrl(event.target.value)}
                        placeholder="https://github.com/owner/repository"
                        autoComplete="url"
                        spellCheck={false}
                        className="sketch-input min-w-0 flex-1 bg-white/70 px-4 py-4 font-mono text-sm text-[#172138] placeholder:text-[#70798e] sm:px-5 sm:text-base"
                        aria-describedby={error ? "form-error" : "repo-hint"}
                      />
                      <button type="submit" className="sketch-button bg-[#3769e8] px-7 py-3 font-bold text-white sm:min-w-40">Fetch repo -&gt;</button>
                    </div>
                    <div className="flex min-h-8 items-start justify-between gap-4 px-2 text-xs sm:text-sm">
                      {error ? (
                        <motion.p id="form-error" role="alert" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} className="font-bold text-[#b9342e]">x {error}</motion.p>
                      ) : (
                        <p id="repo-hint" className="text-[#606a80]">Public repositories only. No funny business.</p>
                      )}
                      <span className="hidden text-[#606a80] sm:block">or press Enter</span>
                    </div>
                  </form>
                </motion.div>
              )}

              {screen === "loading" && (
                <motion.div key="loading" {...screenMotion} className="w-full max-w-xl text-center" aria-live="polite">
                  <p className="mb-5 rotate-1 text-xs font-bold tracking-[0.24em] text-[#d74b42] uppercase">following the wires...</p>
                  <ProgressiveLoading steps={repositoryLoadingSteps} visible={visibleSteps} />
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
                      <button type="button" onClick={copyJson} className="sketch-button bg-[#f6c453] px-4 py-2 text-sm font-bold text-[#172138]">{copied ? "Copied" : "Copy JSON"}</button>
                      <button type="button" onClick={reset} className="sketch-button bg-[#3769e8] px-4 py-2 text-sm font-bold text-white">Another repo</button>
                    </div>
                  </div>
                  {scriptError && (
                    <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} role="alert" className="mb-3 flex items-start justify-between gap-3 rounded-lg border-2 border-[#b9342e] bg-[#fff0ea] px-3 py-2 text-sm font-bold text-[#9e2f2a]">
                      <span>x {scriptError}</span>
                      <button type="button" onClick={() => setScriptError(null)} aria-label="Dismiss error">x</button>
                    </motion.div>
                  )}
                  {script && (
                    <button type="button" onClick={() => setScreen("stage")} className="mb-3 self-start text-sm font-bold text-[#3769e8] underline decoration-wavy underline-offset-4">Return to generated stage -&gt;</button>
                  )}
                  <div className="sketch-box min-h-0 flex-1 overflow-hidden bg-[#111a2b] p-1">
                    <pre className="code-scroll h-full max-h-[52dvh] overflow-auto p-4 font-mono text-[11px] leading-relaxed text-[#dce7ff] sm:p-5 sm:text-xs lg:text-sm"><code>{json}</code></pre>
                  </div>
                </motion.div>
              )}

              {screen === "stage" && script && (
                <motion.div key="stage" {...screenMotion} className="h-full min-h-0 w-full">
                  <RoastStage script={script} onBack={() => setScreen("result")} onReset={reset} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <footer className="relative z-10 flex items-center justify-between border-t-2 border-dashed border-[#3769e8]/35 pt-3 text-[10px] font-bold tracking-[0.14em] text-[#667087] uppercase sm:text-xs">
            <span>public GitHub data + structured OpenAI output</span>
            <span className="rotate-1 text-[#3769e8]">Fish Audio ready text</span>
          </footer>
        </section>
      </div>
    </main>
  );
}
