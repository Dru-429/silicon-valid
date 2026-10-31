import Link from "next/link";
import { Suspense } from "react";
import { RepositoryAnalyzer } from "@/app/components/repository-analyzer";
import { SiliconShell } from "@/app/components/silicon-shell";
import { normalizeGitHubRepositoryUrl } from "@/lib/repository-url";

type DebatePageProps = {
  searchParams: Promise<{ repo?: string | string[] }>;
};

async function DebateContent({ searchParams }: DebatePageProps) {
  const query = await searchParams;
  const rawRepo = Array.isArray(query.repo) ? query.repo[0] : query.repo;
  const repoUrl = normalizeGitHubRepositoryUrl(rawRepo);

  if (!repoUrl) {
    return (
      <SiliconShell
        fullscreen
        backControl={
          <Link href="/" className="text-xs font-bold text-[#3769e8] underline decoration-wavy underline-offset-4">
            &larr; Try another repo
          </Link>
        }
      >
        <div className="w-full  -rotate-[.3deg] text-center">
          <p className="text-xs font-bold tracking-[0.22em] text-[#d74b42] uppercase">No repository found</p>
          <h1 className="mt-3 text-3xl font-bold text-[#172138] sm:text-5xl">That GitHub URL does not look right.</h1>
          <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-[#606a80] sm:text-base">
            Return to the landing page and paste a full public repository URL.
          </p>
          <Link href="/" className="sketch-button mt-7 inline-block bg-[#3769e8] px-6 py-3 font-bold text-white">
            Go Back
          </Link>
        </div>
      </SiliconShell>
    );
  }

  return <RepositoryAnalyzer key={repoUrl} repoUrl={repoUrl} />;
}

function DebateLoading() {
  return (
    <SiliconShell fullscreen>
      <div className="w-full max-w-xl text-center" aria-live="polite">
        <p className="mb-4 rotate-1 text-xs font-bold tracking-[0.24em] text-[#d74b42] uppercase">following the wires...</p>
        <p className="text-xl font-bold text-[#172138]">Opening the repository analyzer...</p>
      </div>
    </SiliconShell>
  );
}

export default function DebatePage({ searchParams }: DebatePageProps) {
  return (
    <Suspense fallback={<DebateLoading />}>
      <DebateContent searchParams={searchParams} />
    </Suspense>
  );
}

