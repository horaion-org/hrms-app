import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { TickIcon } from "@/components/ui/Icon";
import type { SchedulingReadiness } from "@/features/scheduling/readiness/api";
import {
	checklistOf,
	type ReturnLink,
	type SetupView,
} from "@/features/scheduling/readiness/readinessCopy";
import type { DepartmentChoice } from "@/features/workspace/unitChoices";

export type ReadinessCalloutProps = {
	/** The API's readiness for the departments in view. */
	rows: Array<SchedulingReadiness>;
	/** The one department chosen in the Filters; undefined for every department. */
	department?: DepartmentChoice;
	/** The tab it sits on: only the Shifts tab links on to Constraints. */
	view: SetupView;
	/** The way back into the wizard, when the wizard sent the person here. */
	returnTo?: ReturnLink;
	/** Narrows the tab to one of the departments named. */
	onChooseDepartment: (departmentId: string) => void;
	className?: string;
};

/**
 * Guides a first run on the Shifts and Constraints tabs from the API's
 * readiness answer. Under every department, it names those not ready to
 * schedule, each narrowing the tab to it. For one department not ready, a
 * checklist: add a shift, then a staffing constraint. Once that department
 * is ready and the wizard sent the person here, the way back. Nothing is
 * drawn otherwise.
 */
export const ReadinessCallout = ({
	rows,
	department,
	view,
	returnTo,
	onChooseDepartment,
	className,
}: ReadinessCalloutProps): FunctionComponent => {
	const { t } = useTranslation();
	const key = "scheduling.readiness";

	if (department === undefined) {
		const unready = rows.filter((row) => !row.ready);
		if (unready.length === 0) return null;
		return (
			<Callout className={className} tone="warning">
				{t(`${key}.departmentsNotReady`, { count: unready.length })}
				<ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
					{unready.map((row) => (
						<li key={row.departmentId}>
							<Button
								variant="textlink"
								onClick={() => {
									onChooseDepartment(row.departmentId);
								}}
							>
								{row.departmentName}
							</Button>
						</li>
					))}
				</ul>
			</Callout>
		);
	}

	const row = rows.find(
		(each) => each.departmentId === department.departmentId
	);
	if (row === undefined) return null;

	if (row.ready) {
		if (returnTo === undefined) return null;
		return (
			<Callout className={className}>
				<span className="flex flex-wrap items-center gap-x-4 gap-y-2">
					{t(`${key}.ready`, { department: row.departmentName })}
					<Button search={returnTo.search} size="sm" to={returnTo.to}>
						{"step" in returnTo.search
							? t(`${key}.backToSchedule`)
							: t(`${key}.createSchedule`)}
					</Button>
				</span>
			</Callout>
		);
	}

	const [shift, staffing] = checklistOf(row);
	return (
		<Callout className={className} tone="warning">
			{t(`${key}.notReadyTitle`, { department: row.departmentName })}
			<ol className="mt-1 list-inside list-decimal font-normal">
				<li>
					{t(`${key}.addShift`)}
					{shift?.done && (
						<>
							<TickIcon className="ml-2 inline size-4 text-neutral-700" />
							<span className="sr-only">{t(`${key}.done`)}</span>
						</>
					)}
				</li>
				<li>
					{t(`${key}.addStaffing`)} {!shift?.done && t(`${key}.addShiftFirst`)}
					{shift?.done && view === "shifts" && !staffing?.done && (
						<Button
							search={(previous) => ({ ...previous, view: "constraints" })}
							to="/scheduling"
							variant="textlink"
						>
							{t(`${key}.goToConstraints`)}
						</Button>
					)}
				</li>
			</ol>
		</Callout>
	);
};
