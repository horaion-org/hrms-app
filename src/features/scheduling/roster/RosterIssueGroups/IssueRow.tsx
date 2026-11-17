import { useTranslation } from "react-i18next";
import { formatDay } from "@/common/formatDay";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import type { CoverGapRequest } from "@/features/scheduling/cover/api";
import type { RosterIssue } from "@/features/scheduling/roster/rosterIssueGroups";

export type IssueRowProps = {
	issue: RosterIssue;
	/** The locale dates are written in (`formattingLocale`). */
	language: string;
	/** Outlines the item's cell on the grid; no Show button without. */
	onShow?: (issue: RosterIssue) => void;
	/** On a roster that may be changed; no Find cover button without. */
	onFindCover?: (gap: CoverGapRequest) => void;
};

/** Person first, then the day and time and the rule, with its one action on the right. */
export const IssueRow = ({
	issue,
	language,
	onShow,
	onFindCover,
}: IssueRowProps): FunctionComponent => {
	const { t } = useTranslation();
	const { action } = issue;
	const when = [
		issue.day ? formatDay(issue.day, language) : undefined,
		issue.time ?? undefined,
	]
		.filter((part): part is string => part !== undefined)
		.join(" · ");
	// An item with no day has no "when" line, so its hint takes that line.
	const secondLine = when || issue.hint;
	const findCover =
		action.kind === "findCover" && onFindCover
			? (): void => {
					onFindCover(action.gap);
				}
			: undefined;
	// Show needs a cell to outline: a person and a day.
	const show =
		onShow && issue.memberProfileId !== null && issue.day !== null
			? (): void => {
					onShow(issue);
				}
			: undefined;
	const act = findCover ?? show;
	return (
		<li className="flex items-start justify-between gap-3 py-2">
			<div className="flex min-w-0 flex-col">
				<span className="text-sm font-semibold text-neutral-900">
					{issue.who}
				</span>
				{secondLine ? (
					<span className="text-sm text-neutral-700">{secondLine}</span>
				) : null}
				<span className="text-sm text-neutral-700">{issue.rule}</span>
			</div>
			{act ? (
				<Button variant="textlink" onClick={act}>
					{t(
						findCover ? "scheduling.cover.findCover" : "scheduling.issues.show"
					)}
				</Button>
			) : null}
		</li>
	);
};
