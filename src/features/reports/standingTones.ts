import type { BadgeTone } from "@/components/ui/Badge";
import type { Standing } from "@/features/reports/overview";

/** A standing's pill: act is the error tone, watch the warning, on track the success. Status colour, for status only. */
export const STANDING_TONES: Record<Standing, BadgeTone> = {
	ACT: "error",
	WATCH: "warning",
	ON_TRACK: "success",
};
