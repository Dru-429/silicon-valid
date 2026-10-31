"use client";

import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { normalizeGitHubRepositoryUrl } from "@/lib/repository-url";
import { SiliconShell } from "./silicon-shell";

export function RepositoryLanding() {
  const router = useRouter();
  const [repoUrl, setRepoUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const normalizedRepoUrl = normalizeGitHubRepositoryUrl(repoUrl);
    if (!normalizedRepoUrl) {
      setError("Draw me a full GitHub repository URL, like github.com/owner/repo.");
      return;
    }

    router.push(`/debate?repo=${encodeURIComponent(normalizedRepoUrl)}`);
  }

  function reset() {
    setRepoUrl("");
    setError(null);
  }

  return (
    <SiliconShell onLogoClick={reset}>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-3xl"
      >
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
    </SiliconShell>
  );
}

