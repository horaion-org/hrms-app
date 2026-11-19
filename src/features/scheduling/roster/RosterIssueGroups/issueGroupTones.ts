import type { BadgeTone } from "@/components/ui/Badge";
import { AlertIcon, InfoIcon, WarningIcon } from "@/components/ui/Icon";
import type { IssueGroup } from "@/features/scheduling/roster/rosterIssueGroups";

/** How a group looks wherever it is named: its count's badge tone, its icon, and the text colour of its icon and summary part. */
type IssueGroupLook = {
	badgeTone: BadgeTone;
	icon: typeof InfoIcon;
	textTone: string;
};

/** Each group's tone and icon: to fix in red, could not be met in amber, information in grey. */
export const GROUP_LOOKS: Record<IssueGroup, IssueGroupLook> = {
	mustFix: { badgeTone: "error", icon: AlertIcon, textTone: "text-error-700" },
	notMet: {
		badgeTone: "warning",
		icon: WarningIcon,
		textTone: "text-warning-800",
	},
	forInformation: {
		badgeTone: "neutral",
		icon: InfoIcon,
		textTone: "text-neutral-700",
	},
};
