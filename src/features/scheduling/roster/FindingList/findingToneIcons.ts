import type { Heroicon } from "@/common/types";
import { AlertIcon, InfoIcon } from "@/components/ui/Icon";
import type { FindingTone } from "@/features/scheduling/roster/findings/finding";

/**
 * The outline icons of the app's set that mark a finding, by its tone: a
 * triangle in the warning tone for anything to look at (roster notes and
 * setup warnings alike, never red, as red is kept for errors and refusals),
 * the info circle for what is only information. Both tones keep 3:1 against
 * white, the grey header and every shift tint.
 */
export const FINDING_TONE_ICONS: Record<
	FindingTone,
	{ icon: Heroicon; colour: string }
> = {
	error: { icon: AlertIcon, colour: "text-warning-900" },
	warning: { icon: AlertIcon, colour: "text-warning-900" },
	info: { icon: InfoIcon, colour: "text-ink-blue-700" },
};
