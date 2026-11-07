import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import { FINDING_TONE_ICONS } from "@/features/scheduling/FindingList/findingToneIcons";
import type { HeaderCount } from "@/features/scheduling/roster/rosterMarks";

export type RosterHeaderCountProps = {
	/** How many to look at, and in which tone (`rowIssueCount`, `dayIssueCount`). */
	count: HeaderCount;
	/** Names the count and what choosing it does, e.g. "Ben Ong: 1 to look at. Show in Issues". */
	label: string;
	/** Opens the Issues list for this row or day; `from` gets focus back when it closes. */
	onSelect: (from: HTMLElement) => void;
	className?: string;
};

/** The tones a header count reads in: the triangle to look at, the info circle for information only. */
const TONE_ICONS = {
	attention: FINDING_TONE_ICONS.warning,
	info: FINDING_TONE_ICONS.info,
};

/**
 * A count in a roster row's or day's header: the outline icon of its tone,
 * then the number, on no background. Choosing it opens the Issues list for
 * that row or day beside the grid. Icon and number together carry the
 * meaning, so colour is never the only cue.
 */
export const RosterHeaderCount = ({
	count,
	label,
	onSelect,
	className,
}: RosterHeaderCountProps): FunctionComponent => {
	const { icon: Icon, colour } = TONE_ICONS[count.tone];
	return (
		<button
			aria-label={label}
			type="button"
			className={joinClassNames(
				"inline-flex h-6 min-w-6 shrink-0 cursor-pointer items-center justify-center gap-0.5 rounded px-0.5 hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ink-blue-500",
				className
			)}
			onClick={(event) => {
				onSelect(event.currentTarget);
			}}
		>
			<Icon aria-hidden="true" className={joinClassNames("size-4", colour)} />
			<span
				aria-hidden="true"
				className="text-xs font-semibold text-neutral-800 tabular-nums"
			>
				{count.count > 99 ? "99+" : count.count}
			</span>
		</button>
	);
};
