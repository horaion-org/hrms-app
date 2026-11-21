import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { formatDay } from "@/common/formatDay";
import { formattingLocale } from "@/common/formattingLocale";
import type { FunctionComponent } from "@/common/types";
import {
	dayTypeRetypeGroups,
	type IssueFixes,
} from "@/features/scheduling/roster/dayTypeFix";
import type { CoverGapRequest } from "@/features/scheduling/cover/api";
import { issueRows, withGapIssue } from "@/features/scheduling/roster/issueRows";
import {
	gapIssueKey,
	type RosterIssue,
} from "@/features/scheduling/roster/rosterIssueGroups";
import {
	IssueFixAll,
	IssueFixOutcomeLine,
} from "@/features/scheduling/roster/RosterIssueGroups";
import type { IssueCoverContext } from "./GapCover";
import { IssueRowBody } from "./IssueRowBody";
import { IssuesPanel } from "./IssuesPanel";

export type RosterIssuesListProps = {
	issues: ReadonlyArray<RosterIssue>;
	/** A shift's name by its id, for a short shift's row. */
	shiftName: (shiftId: string) => string;
	/** Who works a short shift that day, which its row says where it may not be changed; nobody without. */
	whoWorks?: (gap: CoverGapRequest) => Array<string>;
	/** Under the list, such as the cover offers out. */
	information?: ReactNode;
	onShow?: (issue: RosterIssue) => void;
	/** On a roster that may be changed: what covering a short shift from its row needs. */
	cover?: IssueCoverContext;
	/** The short shift "Find cover" opened Issues on: its row starts open, and is listed even when nothing else names it. */
	openGap?: CoverGapRequest;
	/** The fixes Issues can make itself, on a roster that may be changed. */
	fixes?: IssueFixes;
};

/**
 * The roster's issues as the Issues panel lists them (`issueRows`): one row
 * each, opening to its cover, its fix or its details (`IssueRowBody`). Above
 * the rows, a fix made in part and the fixes for several rows at once.
 */
export const RosterIssuesList = ({
	issues,
	shiftName,
	whoWorks,
	information,
	onShow,
	cover,
	openGap,
	fixes,
}: RosterIssuesListProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const language = formattingLocale(i18n);
	const rows = issueRows(withGapIssue(issues, openGap, shiftName, t), {
		hasFix: (issueKey) => fixes?.retypes.has(issueKey) ?? false,
		shiftName,
		formatOne: (day) => formatDay(day, language),
		t,
	});
	const onFixAll = fixes?.onFixAll;
	const fixGroups =
		fixes && onFixAll
			? dayTypeRetypeGroups(
					issues.filter((issue) => issue.group === "mustFix"),
					fixes.retypes
				)
			: [];
	const lead = (
		<>
			{/* Said here, not on its rows: once the roster is checked again the rows changed are gone. */}
			{fixes?.outcome?.done !== undefined && (
				<IssueFixOutcomeLine outcome={fixes.outcome} />
			)}
			{fixes &&
				onFixAll &&
				fixGroups.map((group) => (
					<IssueFixAll
						key={group.key}
						fixes={{ ...fixes, onFixAll }}
						group={group}
					/>
				))}
		</>
	);
	return (
		<IssuesPanel
			information={information}
			initiallyOpen={openGap && gapIssueKey(openGap.shiftId, openGap.day)}
			lead={lead}
			rows={rows}
			bodyOf={(row) => (
				<IssueRowBody
					cover={cover}
					whoWorks={whoWorks}
					fixes={fixes}
					row={row}
					onShow={onShow}
				/>
			)}
		/>
	);
};
