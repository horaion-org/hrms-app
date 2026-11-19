import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ExpandableList } from "@/components/ui/ExpandableList";
import { GenerateScheduleIcon } from "@/components/ui/Icon";
import {
	failedLineClasses,
	HOME_ROW_COUNT,
	rowAsideClasses,
	rowClasses,
	rowLeadClasses,
	rowListClasses,
	rowTextClasses,
} from "@/features/dashboard/cardStyles";
import type { GuardedRead } from "@/features/dashboard/guardedRead";
import type { NextRosterRow } from "@/features/dashboard/nextRoster";
import { fixLinkOf } from "@/features/scheduling/readiness/readinessCopy";
import { scheduleSetupLink } from "@/features/scheduling/schedules/scheduleViewLink";

const key = "dashboard.cards.nextRoster";

/** The "yyyy-MM" a day falls in, as the month page names it. */
const monthOf = (day: string): string => day.slice(0, "yyyy-MM".length);

export type NextRosterCardProps = {
	/** The Departments whose coming week still waits on a step. */
	rows: GuardedRead<Array<NextRosterRow>>;
	/** The coming week's Monday. */
	comingMonday: string;
	className?: string;
};

/** The one action a row's step leads to; words alone while it waits or once published. */
const StepAction = ({
	row,
	comingMonday,
}: {
	row: NextRosterRow;
	comingMonday: string;
}): FunctionComponent => {
	const { t } = useTranslation();
	const label = t(`${key}.steps.${row.step}`);
	const named = t(`${key}.stepNamed`, {
		step: label,
		department: row.departmentName,
	});
	const unit = { branchId: row.branchId, departmentId: row.departmentId };
	const waiting = <span className={rowAsideClasses}>{label}</span>;
	switch (row.step) {
		case "setUp":
			return (
				<Button
					aria-label={named}
					className="shrink-0"
					to="/scheduling"
					variant="textlink"
					search={fixLinkOf(
						row.missing.includes("SHIFT") ? "shifts" : "constraints",
						unit,
						{ next: "create", week: comingMonday }
					)}
				>
					{label}
				</Button>
			);
		case "generate":
			return (
				<Button
					aria-label={named}
					className="shrink-0"
					params={{ month: monthOf(comingMonday) }}
					search={{ department: row.departmentId }}
					to="/scheduling/months/$month"
					variant="textlink"
				>
					{label}
				</Button>
			);
		case "carryOn":
			return row.scheduleId ? (
				<Button
					{...scheduleSetupLink({
						scheduleId: row.scheduleId,
						departmentId: row.departmentId,
					})}
					aria-label={named}
					className="shrink-0"
					variant="textlink"
				>
					{label}
				</Button>
			) : (
				waiting
			);
		case "review":
		case "fix":
			return row.scheduleId ? (
				<Button
					aria-label={named}
					className="shrink-0"
					params={{ scheduleId: row.scheduleId }}
					to="/scheduling/$scheduleId"
					variant="textlink"
				>
					{label}
				</Button>
			) : (
				waiting
			);
		default:
			return waiting;
	}
};

/**
 * For each Department whose coming week is not yet published, a line: its
 * state, or what blocks scheduling, and the one next step: set up,
 * generate, review, or fix. Shown only where rosters may be read.
 */
export const NextRosterCard = ({
	rows,
	comingMonday,
	className,
}: NextRosterCardProps): FunctionComponent => {
	const { t } = useTranslation();
	if (rows.status === "hidden") return null;
	return (
		<Card
			className={className}
			icon={GenerateScheduleIcon}
			title={t(`${key}.title`)}
		>
			{rows.status === "error" && (
				<p className={failedLineClasses} role="alert">
					{t(`${key}.failed`)}
				</p>
			)}
			{rows.status === "ready" && (
				<ExpandableList
					collapsedCount={HOME_ROW_COUNT}
					itemClassName={rowClasses}
					items={rows.data}
					keyOf={(row) => row.departmentId}
					listClassName={rowListClasses}
					renderItem={(row) => (
						<>
							<span className={rowTextClasses}>
								<span className={rowLeadClasses}>{row.departmentName}</span>
								{" · "}
								{row.missing.length > 0
									? row.missing
											.map((gap) => t(`${key}.missing.${gap}`))
											.join(", ")
									: t(`scheduling.months.states.${row.state}`)}
							</span>
							<StepAction comingMonday={comingMonday} row={row} />
						</>
					)}
				/>
			)}
		</Card>
	);
};
