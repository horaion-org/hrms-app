import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import type { StaffingRule } from "@/features/dashboard/api";
import { cardLinkClasses } from "@/features/dashboard/cardStyles";
import {
	staffingCauseOf,
	type StaffingCause,
} from "@/features/dashboard/staffingCause";

const key = "reports.staffing";

/** Too few people is a hiring question nobody can cover; one-off gaps are a manager's to fill. */
const CAUSE_TONES: Record<StaffingCause, BadgeTone> = {
	TOO_FEW_PEOPLE: "error",
	ONE_OFF: "warning",
};

export type StaffingTableProps = {
	rules: Array<StaffingRule>;
};

/** A rule's row id: its department and name, unique within a company. */
const rowIdOf = (rule: StaffingRule): string =>
	`${rule.departmentId}|${rule.ruleName}`;

/** Where a cause is acted on: the rule itself when too few people hold its titles, else the gaps on Home. */
const NextStep = ({ cause }: { cause: StaffingCause }): FunctionComponent => {
	const { t } = useTranslation();
	if (cause === "TOO_FEW_PEOPLE")
		return (
			<Link
				className={cardLinkClasses}
				search={{ view: "constraints" }}
				to="/scheduling"
			>
				{t(`${key}.editRule`)}
			</Link>
		);
	return (
		<Link className={cardLinkClasses} to="/">
			{t(`${key}.seeGaps`)}
		</Link>
	);
};

/**
 * Each staffing rule beside the people who could fill it: how many it asks
 * for on each shift, how many hold the job titles it counts, the person-days
 * a week it needs against those its title holders can work, and the people
 * short over the range. Each rule names why it runs short and where to act.
 */
export const StaffingTable = ({
	rules,
}: StaffingTableProps): FunctionComponent => {
	const { t } = useTranslation();
	const columns: Array<DataTableColumn<StaffingRule>> = [
		{
			id: "rule",
			header: t(`${key}.rule`),
			pin: "start",
			cell: (rule) => (
				<div className="flex flex-col gap-1">
					<span className="font-semibold">{rule.ruleName}</span>
					<span>
						{t(`${key}.unit`, {
							department: rule.departmentName,
							branch: rule.branchName,
						})}
					</span>
				</div>
			),
			sortValue: (rule) => `${rule.departmentName} ${rule.ruleName}`,
		},
		{
			id: "jobTitles",
			header: t(`${key}.jobTitles`),
			hideBelow: "md",
			cell: (rule) => rule.jobTitles.map((title) => title.name).join(", "),
		},
		{
			id: "needed",
			header: t(`${key}.needed`),
			cell: (rule) => rule.headcount,
			sortValue: (rule) => rule.headcount,
		},
		{
			id: "people",
			header: t(`${key}.people`),
			cell: (rule) => rule.peopleWithTitles,
			sortValue: (rule) => rule.peopleWithTitles,
		},
		{
			id: "days",
			header: t(`${key}.days`),
			hideBelow: "md",
			cell: (rule) =>
				rule.holderDaysAWeek === null
					? t(`${key}.daysNeeded`, { needed: rule.neededShiftDaysAWeek })
					: t(`${key}.daysNeededAndHeld`, {
							needed: rule.neededShiftDaysAWeek,
							held: rule.holderDaysAWeek,
						}),
		},
		{
			id: "gaps",
			header: t(`${key}.gaps`),
			cell: (rule) => rule.gapsInRange,
			sortValue: (rule) => rule.gapsInRange,
		},
		{
			id: "cause",
			header: t(`${key}.cause`),
			cell: (rule): ReactNode => {
				const cause = staffingCauseOf(rule);
				if (cause === undefined) return null;
				return (
					<div className="flex flex-col items-start gap-2">
						<Badge tone={CAUSE_TONES[cause]}>
							{t(`${key}.causes.${cause}`)}
						</Badge>
						<NextStep cause={cause} />
					</div>
				);
			},
		},
	];
	return (
		<DataTable
			columns={columns}
			data={rules}
			defaultSort={{ id: "gaps", desc: true }}
			emptyState={t(`${key}.empty`)}
			getRowId={rowIdOf}
			label={t(`${key}.title`)}
		/>
	);
};
