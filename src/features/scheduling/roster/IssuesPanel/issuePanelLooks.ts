import type { BadgeTone } from "@/components/ui/Badge";
import type { CostChipKind } from "@/features/scheduling/cover/engineRepairWords";
import type { IssueSeverity } from "@/features/scheduling/roster/issueRows";

/** How a severity looks: its row's stripe and its action's badge tone. Must fix in red, if possible in amber, notes in grey. */
export const SEVERITY_LOOKS: Record<
	IssueSeverity,
	{ stripe: string; badgeTone: BadgeTone }
> = {
	mustFix: { stripe: "bg-error-600", badgeTone: "error" },
	ifPossible: { stripe: "bg-warning-600", badgeTone: "warning" },
	note: { stripe: "bg-neutral-400", badgeTone: "neutral" },
};

/** Each cost chip's tone, on a card and in its review: within hours in green, extra hours, overtime and a rest day in amber, the rest neutral. */
export const COST_CHIP_TONES: Record<CostChipKind, BadgeTone> = {
	withinHours: "success",
	pastContract: "warning",
	overtime: "warning",
	restDayWork: "warning",
	timeOffEarned: "neutral",
	notRuleChecked: "neutral",
};
