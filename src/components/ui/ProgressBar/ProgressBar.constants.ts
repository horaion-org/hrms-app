export const progressBarTones = [
	"brand",
	"accent",
	"success",
	"warning",
	"error",
] as const;

export type ProgressBarTone = (typeof progressBarTones)[number];
