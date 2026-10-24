export const speakerIds = ["richard", "jared", "gilfoyle", "dinesh", "erlich"] as const;
export type SpeakerId = (typeof speakerIds)[number];

export type StagePosition = "far-left" | "left" | "center" | "right" | "far-right";
export type ScriptPhase =
  | "first-impression"
  | "technical-autopsy"
  | "fight"
  | "unexpected-praise"
  | "final-verdict";
export type RoastMood = "nervous" | "laughing" | "supportive" | "annoyed" | "sarcastic" | "serious" | "confident" | "neutral";
export type RoastGesture = "open_hands" | "hands_up" | "pointing" | "arms_crossed" | "chin_touch" | "smirk_pose" | "shrug";
export type BubbleSide = "left" | "center" | "right";

export interface SiliconValidScript {
  title?: string;
  repositoryLabel?: string;
  repoSummary?: string;
  strengths?: string[];
  weaknesses?: string[];
  scores?: {
    architecture: number;
    codeQuality: number;
    security: number;
    documentation: number;
    scalability: number;
    developerExperience: number;
    productClarity: number;
    overall: number;
  };
  finalVerdict?: {
    label: string;
    summary: string;
  };
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
    id?: string;
    phase?: ScriptPhase;
    speakerId: SpeakerId;
    speakerName?: string;
    displayText: string;
    fishText: string;
    evidence?: string[];
    mood?: RoastMood;
    gesture?: RoastGesture;
    bubbleSide?: BubbleSide;
  }[];
  verdict?: {
    biggestStrength: string;
    biggestProblem: string;
    fixFirst: string;
    score: number;
    siliconValidVerdict: string;
  };
}

// Kept for compatibility with the original Part 2 naming.
export type RoastScript = SiliconValidScript;
