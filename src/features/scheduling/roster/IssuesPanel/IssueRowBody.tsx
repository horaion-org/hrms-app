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
import { IssueFixOutcomeLine } from "@/features/scheduling/roster/RosterIssueGroups";
import { GapCover, type IssueCoverContext } from "./GapCover";
import { RetypeFix } from "./RetypeFix";

export type IssueRowBodyProps = {
	row: IssueRow;
	/** Outlines the issue's cell on the grid; no Show without. */
	onShow?: (issue: RosterIssue) => void;
	/** On a roster that may be changed: what covering a short shift needs. */
	cover?: IssueCoverContext;
	/** The fixes Issues can make itself. */
	fixes?: IssueFixes;
};

/**
 * What a row opens to: for a short shift on a roster that may be changed, its
 * options (`GapCover`); for a fix Issues knows, the day drawn before → after
 * with Apply (`RetypeFix`); otherwise (a rule asked "if possible" among them,
 * which has nothing to apply) why it is listed, in the engine's sentences,
 * and what to do. Show outlines it on the grid. Never empty.
 */
export const IssueRowBody = ({
	row,
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
			{retype && fixes ? (
				<RetypeFix fixes={fixes} retype={retype} />
			) : (
				<>
					<p className="text-neutral-800">{issue.rule}</p>
					{advice && (
						<p className="text-neutral-700">{issueAdviceLine(advice, t)}</p>
					)}
				</>
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
