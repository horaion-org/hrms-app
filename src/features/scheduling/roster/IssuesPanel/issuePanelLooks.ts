import type { BadgeTone } from "@/components/ui/Badge";
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
