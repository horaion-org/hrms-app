import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { formattingLocale } from "@/common/formattingLocale";
import type { FunctionComponent } from "@/common/types";
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
 * The Issues tab by what to do: the validation result card, then Must fix,
 * Could not be met and More information (closed until opened), each
 * foldable and left out when empty, ordered by person or by day. The counts
 * are the summary line under the panel's title (`IssueSummary`).
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
			{validationNote}
			{groups.length === 0 ? null : (
				<>
					<div
						aria-label={t(`${key}.orderLabel`)}
						className="flex gap-4"
						role="group"
					>
						{/* Text links, not pills: the switch must not outweigh the groups. The choice is marked by weight and underline, not colour alone. */}
						{ORDERS.map((option) => (
							<Button
								key={option}
								aria-pressed={order === option}
								className={
									order === option
										? "font-medium underline underline-offset-4"
										: undefined
								}
								variant="textlink"
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
