export const badgeTones = ["success", "warning", "error", "neutral"] as const;

export type BadgeTone = (typeof badgeTones)[number];
