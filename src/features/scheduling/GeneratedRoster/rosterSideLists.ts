import type { Heroicon } from "@/common/types";
import { AlertIcon, HistoryIcon } from "@/components/ui/Icon";
import type { RosterPanel } from "@/features/scheduling/roster/rosterSearch";

/** How each side panel list is named, and, for the ones opened from the week bar, its button. */
export const ROSTER_SIDE_LISTS: Record<
	RosterPanel,
	{
		titleKey:
			| "scheduling.detail.issues"
			| "scheduling.detail.changes"
			| "scheduling.detail.details.title";
		button?: {
			/** The button's name with its count, e.g. "Issues: 11". */
			labelKey:
				"scheduling.detail.issuesCount" | "scheduling.detail.changesCount";
			icon: Heroicon;
			iconTone: string;
		};
	}
> = {
	issues: {
		titleKey: "scheduling.detail.issues",
		button: {
			labelKey: "scheduling.detail.issuesCount",
			icon: AlertIcon,
			iconTone: "text-warning-900",
		},
	},
	changes: {
		titleKey: "scheduling.detail.changes",
		button: {
			labelKey: "scheduling.detail.changesCount",
			icon: HistoryIcon,
			iconTone: "text-ink-blue-700",
		},
	},
	// Opened from the page's "More actions" menu.
	details: { titleKey: "scheduling.detail.details.title" },
};
