import { useTranslation } from "react-i18next";
import { formatDay } from "@/common/formatDay";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import type { CoverGapRequest } from "@/features/scheduling/cover/api";
import type { IssueFixes } from "@/features/scheduling/roster/dayTypeFix";
import {
	issueAdviceLine,
	issueAdviceOf,
} from "@/features/scheduling/roster/issueAdvice";
import {
	dayListText,
	type RosterIssue,
} from "@/features/scheduling/roster/rosterIssueGroups";
import {
	IssueFixAdvice,
	IssueFixButton,
	IssueFixOutcomeLine,
} from "./IssueFix";

export type IssueRowProps = {
	issue: RosterIssue;
	/** The locale dates are written in (`formattingLocale`). */
	language: string;
	/** Outlines the item's cell on the grid; no Show button without. */
	onShow?: (issue: RosterIssue) => void;
	/** On a roster that may be changed; no Find cover button without. */
	onFindCover?: (gap: CoverGapRequest) => void;
	/** The fixes Issues can make itself; a row with one names its day and gains its button. */
	fixes?: IssueFixes;
};

/**
 * One fact on two lines, its one action on the right. First, who or what,
 * then the day and time: "1 Concierge short · Mon, 23 Nov · 07:00–15:00".
 * Second, in grey: why it is listed, the rule last. Third, in grey, when
 * there is something to advise: "What to do:" and one sentence. A row with a
 * fix (`fixes`) names the day to change there, and has a second action under
 * the first: "Make it a rest day".
 */
export const IssueRow = ({
	issue,
	language,
	onShow,
	onFindCover,
	fixes,
}: IssueRowProps): FunctionComponent => {
	const { t } = useTranslation();
	const { action } = issue;
	const formatOne = (day: string): string => formatDay(day, language);
	// A row standing for several days names them all, as a run or a list.
	const days = issue.days ?? (issue.day ? [issue.day] : []);
	const when = [
		days.length > 0 ? dayListText(days, formatOne, t) : undefined,
		issue.time ?? undefined,
	]
		.filter((part): part is string => part !== undefined)
		.join(" · ");
	const headline = when ? `${issue.who} · ${when}` : issue.who;
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
	// Advice to press Find cover is only for a row that draws the button.
	const advice =
		action.kind === "findCover" && !findCover
			? undefined
			: issueAdviceOf(issue);
	const retype = fixes?.retypes.get(issue.key);
	const actButton = act ? (
		<Button className="shrink-0" variant="textlink" onClick={act}>
			{t(findCover ? "scheduling.cover.findCover" : "scheduling.issues.show")}
		</Button>
	) : null;
	return (
		<li className="flex items-start justify-between gap-3 py-2">
			<div className="flex min-w-0 flex-col">
				<span className="text-sm font-medium text-neutral-900">{headline}</span>
				<span className="text-sm text-neutral-700">{issue.rule}</span>
				{retype ? (
					<IssueFixAdvice
						language={language}
						name={issue.who}
						retype={retype}
					/>
				) : null}
				{advice && !retype ? (
					<span className="text-sm text-neutral-700">
						{issueAdviceLine(advice, t)}
					</span>
				) : null}
				{fixes?.outcome?.key === issue.key ? (
					<IssueFixOutcomeLine outcome={fixes.outcome} />
				) : null}
			</div>
			{retype && fixes ? (
				<div className="flex shrink-0 flex-col items-end gap-1">
					{actButton}
					<IssueFixButton fixes={fixes} retype={retype} />
				</div>
			) : (
				actButton
			)}
		</li>
	);
};
