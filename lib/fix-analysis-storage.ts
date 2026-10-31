import type { FixAnalysisResult } from "@/types/fix-analysis";

const resultKey = (analysisId: string) => `silicon-valid:fix-analysis:${analysisId}`;

export function saveFixAnalysisResult(result: FixAnalysisResult) {
  window.sessionStorage.setItem(resultKey(result.analysisId), JSON.stringify(result));
}

export function loadFixAnalysisResult(analysisId: string) {
  const serialized = window.sessionStorage.getItem(resultKey(analysisId));
  if (!serialized) return null;

  try {
    return JSON.parse(serialized) as FixAnalysisResult;
  } catch {
    window.sessionStorage.removeItem(resultKey(analysisId));
    return null;
  }
}

