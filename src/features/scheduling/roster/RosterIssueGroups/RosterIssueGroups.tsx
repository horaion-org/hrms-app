import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { formattingLocale } from "@/common/formattingLocale";
import type { FunctionComponent } from "@/common/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { CoverGapRequest } from "@/features/scheduling/cover/api";
import {
	ISSUE_GROUPS,
	issueCounts,
	issuesOfGroup,
	type IssueOrder,
	type RosterIssue,
} from "@/features/scheduling/roster/rosterIssueGroups";
import { IssueGroupSection } from "./IssueGroupSection";
import { GROUP_TONES } from "./issueGroupTones";

const key = "scheduling.issues";

const ORDERS: ReadonlyArray<IssueOrder> = ["byPerson", "byDay"];

export type RosterIssueGroupsProps = {
	issues: ReadonlyArray<RosterIssue>;
	/** The validation result card, under the summary. */
	validationNote?: ReactNode;
	/** More information under its items, such as the cover offers out. */
	information?: ReactNode;
	/** Outlines the item's cell on the grid; no Show buttons without. */
	onShow?: (issue: RosterIssue) => void;
	/** On a roster that may be changed; no Find cover buttons without. */
	onFindCover?: (gap: CoverGapRequest) => void;
};

/**
 * The Issues tab by what to do: the counts in each group's tone, the
 * validation result, then Must fix, Could not be met and More
 * information (closed until opened), each foldable, ordered by person or by day.
 */
export const RosterIssueGroups = ({
	issues,
	validationNote,
	information,
	onShow,
	onFindCover,
}: RosterIssueGroupsProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const [order, setOrder] = useState<IssueOrder>("byPerson");
	const language = formattingLocale(i18n);
	const counts = issueCounts(issues);
	const groups = ISSUE_GROUPS.filter(
		(group) =>
			counts[group] > 0 || (group === "forInformation" && Boolean(information))
	);
	return (
		<div className="flex flex-col gap-3">
			{issues.length > 0 ? (
				<p className="flex flex-wrap gap-2">
					{ISSUE_GROUPS.filter((group) => counts[group] > 0).map((group) => (
						<Badge key={group} tone={GROUP_TONES[group]}>
							{t(`${key}.summary.${group}`, { count: counts[group] })}
						</Badge>
					))}
				</p>
			) : null}
			{validationNote}
			{groups.length === 0 ? (
				<p className="text-sm text-neutral-700">{t(`${key}.nothingWrong`)}</p>
			) : (
				<>
					<div
						aria-label={t(`${key}.orderLabel`)}
						className="flex gap-2"
						role="group"
					>
						{ORDERS.map((option) => (
							<Button
								key={option}
								aria-pressed={order === option}
								size="sm"
								variant={order === option ? "primary" : "secondary"}
								onClick={(): void => {
									setOrder(option);
								}}
							>
								{t(`${key}.order.${option}`)}
							</Button>
						))}
					</div>
					{groups.map((group) => (
						<IssueGroupSection
							key={group}
							extra={group === "forInformation" ? information : undefined}
							group={group}
							items={issuesOfGroup(issues, group, order)}
							language={language}
							onFindCover={onFindCover}
							onShow={onShow}
						/>
					))}
				</>
			)}
		</div>
	);
};
