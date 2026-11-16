import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ExpandableList } from "@/components/ui/ExpandableList";
import { GenerateScheduleIcon } from "@/components/ui/Icon";
import {
	failedLineClasses,
	rowClasses,
	rowDetailClasses,
	rowListClasses,
	rowTitleClasses,
} from "@/features/dashboard/cardStyles";
import type { GuardedRead } from "@/features/dashboard/guardedRead";
import type { NextRosterRow } from "@/features/dashboard/nextRoster";
import { weekStateTones } from "@/features/scheduling/months/weekStateLooks";
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

/** The one button a row's step leads to; none while it waits or once published. */
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
	switch (row.step) {
		case "setUp":
			return (
				<Button
					aria-label={named}
					size="sm"
					to="/scheduling"
					variant="secondary"
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
					params={{ month: monthOf(comingMonday) }}
					search={{ department: row.departmentId }}
					size="sm"
					to="/scheduling/months/$month"
					variant="secondary"
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
					size="sm"
					variant="secondary"
				>
					{label}
				</Button>
			) : null;
		case "review":
		case "fix":
			return row.scheduleId ? (
				<Button
					aria-label={named}
					params={{ scheduleId: row.scheduleId }}
					size="sm"
					to="/scheduling/$scheduleId"
					variant={row.step === "review" ? "primary" : "secondary"}
				>
					{label}
				</Button>
			) : null;
		default:
			return <span className={rowDetailClasses}>{label}</span>;
	}
};

/**
 * For each Department whose coming week is not yet published, its state
 * and the one next step: set up what blocks scheduling, generate, review,
 * or fix. Shown only where rosters may be read.
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
					itemClassName={rowClasses}
					items={rows.data}
					keyOf={(row) => row.departmentId}
					listClassName={rowListClasses}
					renderItem={(row) => (
						<>
							<div className="flex flex-wrap items-center justify-between gap-2">
								<span className={rowTitleClasses}>{row.departmentName}</span>
								<Badge tone={weekStateTones[row.state]}>
									{t(`scheduling.months.states.${row.state}`)}
								</Badge>
							</div>
							{row.missing.length > 0 && (
								<span className={rowDetailClasses}>
									{row.missing
										.map((gap) => t(`${key}.missing.${gap}`))
										.join(" · ")}
								</span>
							)}
							<div>
								<StepAction comingMonday={comingMonday} row={row} />
							</div>
						</>
					)}
				/>
			)}
		</Card>
	);
};
