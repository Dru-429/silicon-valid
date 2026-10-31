import { Suspense } from "react";
import { RepositoryResults } from "@/app/components/repository-results";
import { SiliconShell } from "@/app/components/silicon-shell";

type ResultsPageProps = {
  searchParams: Promise<{ id?: string | string[] }>;
};

async function ResultsContent({ searchParams }: ResultsPageProps) {
  const query = await searchParams;
  const analysisId = Array.isArray(query.id) ? query.id[0] : query.id;
  return <RepositoryResults analysisId={analysisId ?? null} />;
}

function ResultsLoading() {
  return (
    <SiliconShell fullscreen>
      <div className="w-full max-w-xl text-center" aria-live="polite">
        <p className="text-xs font-bold tracking-[0.22em] text-[#d74b42] uppercase">assembling field notes...</p>
        <h1 className="mt-3 text-3xl font-bold text-[#172138] sm:text-5xl">Opening repository review</h1>
      </div>
    </SiliconShell>
  );
}

export default function ResultsPage({ searchParams }: ResultsPageProps) {
  return (
    <Suspense fallback={<ResultsLoading />}>
      <ResultsContent searchParams={searchParams} />
    </Suspense>
  );
}

