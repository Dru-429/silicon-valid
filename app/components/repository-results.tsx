"use client";

import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { loadFixAnalysisResult } from "@/lib/fix-analysis-storage";
import { fixCategories, fixSeverities, type FixAnalysisResult, type FixCategory } from "@/types/fix-analysis";
import { SiliconShell } from "./silicon-shell";

type Filter = "all" | FixCategory;

const categoryLabels: Record<FixCategory, string> = {
  security: "Security",
  backend: "Backend",
  frontend: "Frontend",
  "code-quality": "Quality",
  scalability: "Scalability",
};

const severityStyles = {
  critical: "border-[#ff473d] bg-[#ff473d]/12 text-[#ff8a83]",
  high: "border-[#f07b4f] bg-[#f07b4f]/12 text-[#ffab89]",
  medium: "border-[#f6c453] bg-[#f6c453]/12 text-[#ffda82]",
  low: "border-[#57d4c4] bg-[#57d4c4]/10 text-[#8aeee2]",
};

export function RepositoryResults({ analysisId }: { analysisId: string | null }) {
  const router = useRouter();
  const [result, setResult] = useState<FixAnalysisResult | null | undefined>(undefined);
  const [filter, setFilter] = useState<Filter>("all");
  const [showFixPlan, setShowFixPlan] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setResult(analysisId ? loadFixAnalysisResult(analysisId) : null);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [analysisId]);

  const filteredFindings = useMemo(
    () => result?.findings.filter((finding) => filter === "all" || finding.category === filter) ?? [],
    [filter, result],
  );

  const severityCounts = useMemo(
    () => Object.fromEntries(fixSeverities.map((severity) => [severity, result?.findings.filter((finding) => finding.severity === severity).length ?? 0])),
    [result],
  ) as Record<(typeof fixSeverities)[number], number>;

  if (result === undefined) {
    return (
      <SiliconShell fullscreen>
        <div className="w-full max-w-xl text-center" aria-live="polite">
          <p className="text-xs font-bold tracking-[0.22em] text-[#d74b42] uppercase">assembling field notes...</p>
          <h1 className="mt-3 text-3xl font-bold text-[#172138] sm:text-5xl">Opening repository review</h1>
        </div>
      </SiliconShell>
    );
  }

  if (!result) {
    return (
      <SiliconShell fullscreen>
        <div className="w-full max-w-xl text-center">
          <p className="text-xs font-bold tracking-[0.22em] text-[#d74b42] uppercase">Review unavailable</p>
          <h1 className="mt-3 text-3xl font-bold text-[#172138] sm:text-5xl">These field notes are missing.</h1>
          <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-[#606a80]">Results are stored for this browser session. Return to the debate and run the repository review again.</p>
          <button type="button" onClick={() => router.back()} className="sketch-button mt-7 bg-[#3769e8] px-6 py-3 font-bold text-white">&larr; Go Back</button>
        </div>
      </SiliconShell>
    );
  }

  const planSections = [
    { title: "Do first", items: result.fixPlan.doFirst },
    { title: "Do next", items: result.fixPlan.doNext },
    { title: "Later", items: result.fixPlan.later },
  ];

  return (
    <SiliconShell
      fullscreen
      backControl={
        <button type="button" onClick={() => router.back()} className="text-xs font-bold text-[#3769e8] underline decoration-wavy underline-offset-4">
          &larr; Debate
        </button>
      }
    >
      <div className="code-scroll h-full min-h-0 w-full overflow-y-auto pr-1 text-[#172138]">
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="mx-auto w-full max-w-6xl pb-8">
          <div className="flex flex-col gap-5 border-b-2 border-dashed border-[#3769e8]/30 pb-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold tracking-[0.22em] text-[#d74b42] uppercase">Repository Review</p>
              <h1 className="mt-1 break-all text-3xl font-bold sm:text-5xl">{result.repository.owner}/{result.repository.name}</h1>
              <p className="mt-2 text-sm font-bold text-[#566078]">{result.findings.length} issue{result.findings.length === 1 ? "" : "s"} found</p>
            </div>
            <button type="button" onClick={() => setShowFixPlan((current) => !current)} className="sketch-button self-start bg-[#d74b42] px-5 py-2.5 text-sm font-bold text-white sm:self-auto">
              {showFixPlan ? "Hide Fix Plan" : "Make it Valid"}
            </button>
          </div>

          <section className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Issue severity summary">
            {fixSeverities.map((severity) => (
              <div key={severity} className={`rounded-[12px_15px_11px_14px] border-2 px-4 py-3 ${severityStyles[severity]}`}>
                <p className="text-[10px] font-black tracking-[0.18em] uppercase">{severity}</p>
                <p className="mt-1 text-3xl font-black">{severityCounts[severity]}</p>
              </div>
            ))}
          </section>

          <section className="sketch-box mt-5 bg-white/65 p-5 sm:p-6">
            <p className="text-[10px] font-black tracking-[0.2em] text-[#3769e8] uppercase">Overall</p>
            <p className="mt-2 max-w-4xl text-sm leading-relaxed font-bold text-[#3e485e] sm:text-base">{result.summary}</p>
            {result.unavailableCategories.length > 0 && (
              <p className="mt-3 text-xs text-[#8a5b32]">Partial review: {result.unavailableCategories.map((category) => categoryLabels[category]).join(", ")} unavailable.</p>
            )}
          </section>

          <AnimatePresence>
            {showFixPlan && (
              <motion.section
                initial={{ opacity: 0, height: 0, y: -8 }}
                animate={{ opacity: 1, height: "auto", y: 0 }}
                exit={{ opacity: 0, height: 0, y: -8 }}
                className="mt-5 overflow-hidden"
              >
                <div className="sketch-box bg-[#111a2b] p-5 text-white sm:p-6">
                  <p className="text-xs font-black tracking-[0.22em] text-[#ffca70] uppercase">Fix Plan</p>
                  <div className="mt-4 grid gap-5 lg:grid-cols-3">
                    {planSections.map((section) => (
                      <div key={section.title}>
                        <h2 className="text-sm font-black text-white">{section.title}</h2>
                        {section.items.length ? (
                          <ol className="mt-2 space-y-2">
                            {section.items.map((item, index) => (
                              <li key={item.findingId} className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs leading-relaxed text-white/75">
                                <span className="mr-2 font-black text-[#ffbd64]">{index + 1}.</span>{item.title}
                                <span className="mt-1 block font-mono text-[9px] text-white/40">{item.file}</span>
                              </li>
                            ))}
                          </ol>
                        ) : (
                          <p className="mt-2 text-xs text-white/35">Nothing queued.</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </motion.section>
            )}
          </AnimatePresence>

          <nav className="mt-6 flex flex-wrap gap-2 border-y-2 border-dashed border-[#3769e8]/25 py-4" aria-label="Filter findings">
            {(["all", ...fixCategories] as const).map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setFilter(category)}
                className={`rounded-full border-2 px-3 py-1.5 text-xs font-black transition ${filter === category ? "border-[#3769e8] bg-[#3769e8] text-white" : "border-[#3769e8]/25 bg-white/55 text-[#465169] hover:border-[#3769e8]/60"}`}
              >
                {category === "all" ? "All" : categoryLabels[category]}
              </button>
            ))}
          </nav>

          <div className="mt-5 space-y-4">
            {filteredFindings.map((finding) => (
              <motion.article key={finding.id} layout className="sketch-box bg-white/72 p-5 sm:p-6">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full border px-2 py-1 text-[9px] font-black tracking-[0.16em] uppercase ${severityStyles[finding.severity]}`}>{finding.severity}</span>
                  <span className="text-[10px] font-black tracking-[0.14em] text-[#3769e8] uppercase">{categoryLabels[finding.category]}</span>
                </div>
                <h2 className="mt-3 text-xl font-bold sm:text-2xl">{finding.title}</h2>
                <p className="mt-2 font-mono text-[10px] text-[#687188] sm:text-xs">
                  {finding.file}{finding.lineStart ? ` · Lines ${finding.lineStart}${finding.lineEnd && finding.lineEnd !== finding.lineStart ? `–${finding.lineEnd}` : ""}` : ""}
                </p>
                <p className="mt-4 text-sm leading-relaxed text-[#465169]">{finding.description}</p>
                {finding.evidence && <p className="mt-3 rounded-lg border border-[#3769e8]/15 bg-[#edf2ff] px-3 py-2 font-mono text-[10px] leading-relaxed text-[#334b83] sm:text-xs">{finding.evidence}</p>}
                <div className="mt-5 grid gap-4 border-t-2 border-dashed border-[#172138]/12 pt-4 md:grid-cols-2">
                  <div>
                    <h3 className="text-[10px] font-black tracking-[0.16em] text-[#d74b42] uppercase">Why this matters</h3>
                    <p className="mt-1 text-sm leading-relaxed text-[#4b556a]">{finding.whyItMatters}</p>
                  </div>
                  <div>
                    <h3 className="text-[10px] font-black tracking-[0.16em] text-[#2f7a4e] uppercase">Recommended fix</h3>
                    <p className="mt-1 text-sm leading-relaxed text-[#4b556a]">{finding.recommendedFix}</p>
                  </div>
                </div>
                <p className="mt-4 text-right text-[10px] font-black tracking-[0.14em] text-[#667087] uppercase">Confidence {finding.confidence}%</p>
              </motion.article>
            ))}
            {!filteredFindings.length && (
              <div className="sketch-box bg-white/60 p-8 text-center text-sm font-bold text-[#667087]">No findings in this category.</div>
            )}
          </div>
        </motion.div>
      </div>
    </SiliconShell>
  );
}

