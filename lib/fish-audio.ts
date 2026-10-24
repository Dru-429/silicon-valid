import type { SpeakerId } from "@/types/script";

export const fishSpeakerOrder: SpeakerId[] = [
  "dinesh",
  "gilfoyle",
  "richard",
  "jared",
  "erlich",
];

// Public demo voices published in Fish Audio's own API examples. Override any
// of them in .env.local with a voice from your Fish Audio voice library.
const demoVoiceIds: Record<SpeakerId, string> = {
  dinesh: "fbe02f8306fc4d3d915e9871722a39d5",
  gilfoyle: "536d3a5e000945adb7038665781a4aca",
  richard: "f3a2b90078d54a65af4b95f63bc7798e",
  jared: "933563129e564b19a115bedd57b7406a",
  erlich: "7f92f8afb8ec43bf81429cc1c9199cb1",
};

const voiceEnvKeys: Record<SpeakerId, string> = {
  dinesh: "FISH_VOICE_DINESH",
  gilfoyle: "FISH_VOICE_GILFOYLE",
  richard: "FISH_VOICE_RICHARD",
  jared: "FISH_VOICE_JARED",
  erlich: "FISH_VOICE_ERLICH",
};

export function getFishVoiceIds() {
  return fishSpeakerOrder.map((speakerId) => {
    const key = voiceEnvKeys[speakerId];
    return process.env[key]?.trim() || demoVoiceIds[speakerId];
  });
}

export function sanitizeFishText(text: string) {
  return text
    .replace(/<\|speaker:\d+\|>/gi, "")
    .replace(/\u0000/g, "")
    .trim();
}
