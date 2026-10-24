export const speakerIds = ["richard", "jared", "gilfoyle", "dinesh", "erlich"] as const;
export type SpeakerId = (typeof speakerIds)[number];

export type StagePosition = "far-left" | "left" | "center" | "right" | "far-right";
export type ScriptPhase =
  | "first-impression"
  | "technical-autopsy"
  | "fight"
  | "unexpected-praise"
  | "final-verdict";

export interface RoastScript {
  title: string;
  repositoryLabel: string;
  cast: {
    id: SpeakerId;
    name: string;
    stagePosition: StagePosition;
    role: string;
    topics: string[];
    description: string;
    talkingStyle: string;
  }[];
  turns: {
    phase: ScriptPhase;
    speakerId: SpeakerId;
    displayText: string;
    fishText: string;
    evidence: string[];
  }[];
  verdict: {
    biggestStrength: string;
    biggestProblem: string;
    fixFirst: string;
    score: number;
    siliconValidVerdict: string;
  };
}
