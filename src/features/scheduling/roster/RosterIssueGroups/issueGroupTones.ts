import type { BadgeTone } from "@/components/ui/Badge";
import type { IssueGroup } from "@/features/scheduling/roster/rosterIssueGroups";

/** Each group's tone, in the header summary and on its heading. */
export const GROUP_TONES: Record<IssueGroup, BadgeTone> = {
	mustFix: "error",
	notMet: "warning",
	forInformation: "neutral",
};
