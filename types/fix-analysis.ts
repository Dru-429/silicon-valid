export const fixCategories = ["security", "backend", "frontend", "code-quality", "scalability"] as const;
export type FixCategory = (typeof fixCategories)[number];

export const fixSeverities = ["critical", "high", "medium", "low"] as const;
export type FixSeverity = (typeof fixSeverities)[number];

export type FixFinding = {
  id: string;
  category: FixCategory;
  title: string;
  description: string;
  severity: FixSeverity;
  file: string;
  lineStart?: number;
  lineEnd?: number;
  evidence?: string;
  whyItMatters: string;
  recommendedFix: string;
  confidence: number;
};

export type FixPlanItem = {
  findingId: string;
  title: string;
  file: string;
};

export type FixAnalysisResult = {
  analysisId: string;
  repository: {
    owner: string;
    name: string;
    url: string;
  };
  summary: string;
  findings: FixFinding[];
  fixPlan: {
    doFirst: FixPlanItem[];
    doNext: FixPlanItem[];
    later: FixPlanItem[];
  };
  unavailableCategories: FixCategory[];
  completedAt: string;
};

export type FixAnalysisEvent =
  | { type: "file-read"; file: string }
  | { type: "analysis-complete"; category: FixCategory }
  | { type: "analysis-unavailable"; category: FixCategory }
  | { type: "finalizing" }
  | { type: "complete"; result: FixAnalysisResult }
  | { type: "error"; message: string };

