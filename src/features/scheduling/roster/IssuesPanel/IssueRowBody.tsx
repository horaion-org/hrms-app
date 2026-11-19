import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import type { IssueFixes } from "@/features/scheduling/roster/dayTypeFix";
import {
	issueAdviceLine,
	issueAdviceOf,
} from "@/features/scheduling/roster/issueAdvice";
import type { IssueRow } from "@/features/scheduling/roster/issueRows";
import type { RosterIssue } from "@/features/scheduling/roster/rosterIssueGroups";
import {
	IssueFixAdvice,
	IssueFixButton,
	IssueFixOutcomeLine,
} from "@/features/scheduling/roster/RosterIssueGroups";
import { GapCover, type IssueCoverContext } from "./GapCover";

export type IssueRowBodyProps = {
	row: IssueRow;
	/** The locale dates are written in (`formattingLocale`). */
	language: string;
	/** Outlines the issue's cell on the grid; no Show without. */
	onShow?: (issue: RosterIssue) => void;
	/** On a roster that may be changed: what covering a short shift needs. */
	cover?: IssueCoverContext;
	/** The fixes Issues can make itself. */
	fixes?: IssueFixes;
};

/**
 * What a row opens to: for a short shift on a roster that may be changed, its
 * options (`GapCover`); for a fix Issues knows, the fix and its button;
 * otherwise why it is listed and what to do, with Show on the grid. Never
 * empty: the issue's own sentence is there whenever there are no options.
 */
export const IssueRowBody = ({
	row,
	language,
	onShow,
	cover,
	fixes,
}: IssueRowBodyProps): FunctionComponent => {
	const { t } = useTranslation();
	const { issue } = row;
	if (issue.action.kind === "findCover" && cover)
		return <GapCover cover={cover} gap={issue.action.gap} />;
	const retype = fixes?.retypes.get(issue.key);
	const advice = issueAdviceOf(issue);
	const canShow =
		onShow !== undefined && issue.memberProfileId !== null && issue.day !== null;
	return (
		<>
			<p className="text-neutral-800">{issue.rule}</p>
			{retype && fixes ? (
				<>
					<IssueFixAdvice language={language} name={issue.who} retype={retype} />
					<IssueFixButton fixes={fixes} retype={retype} />
				</>
			) : (
				advice && (
					<p className="text-neutral-700">{issueAdviceLine(advice, t)}</p>
				)
			)}
			{fixes?.outcome?.key === issue.key && (
				<IssueFixOutcomeLine outcome={fixes.outcome} />
			)}
			{canShow && (
				<Button
					className="self-start"
					variant="textlink"
					onClick={(): void => {
						onShow(issue);
					}}
				>
					{t("scheduling.issues.show")}
				</Button>
			)}
		</>
	);
};
