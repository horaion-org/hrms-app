import { getRouteApi } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { DatePicker } from "@/components/forms/DatePicker";
import { Callout } from "@/components/ui/Callout";
import { useOvertime } from "@/features/dashboard/useDashboardReads";
import { ReportSection } from "@/features/reports/ReportSection";
import { REPORTS_UNIT_RULES } from "@/features/reports/reportsUnitRules";
import {
	monthsOf,
	MOST_DAYS_IN_RANGE,
	rangeOf,
	rangeProblemOf,
} from "@/features/reports/reportsSearch";
import { OvertimeTable } from "@/features/reports/OvertimeTable";
import { RosterStabilityTable } from "@/features/reports/RosterStabilityTable";
import { StaffingTable } from "@/features/reports/StaffingTable";
import {
	useRosterChanges,
	useStaffing,
} from "@/features/reports/useReportsReads";
import { DepartmentFilter } from "@/features/workspace/DepartmentFilter";
import { SCHEDULE_READ_KEYS } from "@/features/workspace/permissionKeys";
import { selectedUnits } from "@/features/workspace/unitSelection";
import { unitSelectionOf } from "@/features/workspace/unitSearch";
import { useCurrentCompanyId } from "@/features/workspace/useCurrentCompany";
import { useUnitSelection } from "@/features/workspace/useUnitSelection";

const key = "reports";

const route = getRouteApi("/_authenticated/_app/reports");

/**
 * Reports: three tables over a range of days in the header's Branch,
 * narrowed to a Department from the filter. Staffing against each staffing
 * rule, overtime by department and month against the ceiling, and how much
 * published rosters changed. The range and units are kept in the URL.
 */
export const Reports = (): FunctionComponent => {
	const { t } = useTranslation();
	const companyId = useCurrentCompanyId();
	const navigate = route.useNavigate();
	const search = route.useSearch();
	const resolved = useUnitSelection(
		companyId,
		SCHEDULE_READ_KEYS,
		unitSelectionOf(search),
		REPORTS_UNIT_RULES
	);
	const units = selectedUnits(resolved);
	const range = rangeOf(search, new Date());
	const problem = rangeProblemOf(range);
	const asked = problem === undefined;
	const staffing = useStaffing(companyId, units, range, asked);
	const overtime = useOvertime(companyId, units, monthsOf(range), asked);
	const changes = useRosterChanges(companyId, units, range, asked);
	const nothingInReach = [staffing, overtime, changes].every(
		(read) => read.status === "hidden"
	);
	return (
		<div className="flex flex-col gap-8">
			<div className="flex flex-col gap-2">
				<h1 className="text-2xl font-semibold text-neutral-900">
					{t("shell.navigation.reports")}
				</h1>
				<p className="text-sm text-neutral-800">{t(`${key}.subtitle`)}</p>
			</div>
			<div className="flex flex-col gap-4 sm:flex-row sm:items-end">
				<div className="w-full sm:w-72">
					<DatePicker
						label={t(`${key}.range`)}
						value={{ start: range.from, end: range.to }}
						onChange={({ start, end }) => {
							if (start && end)
								void navigate({
									search: (previous) => ({ ...previous, from: start, to: end }),
								});
						}}
					/>
				</div>
				<div className="w-full sm:w-72">
					<DepartmentFilter
						selection={resolved}
						onChange={(department) => {
							void navigate({
								search: (previous) => ({ ...previous, department }),
							});
						}}
					/>
				</div>
			</div>
			{problem && (
				<Callout tone="warning">
					{t(`${key}.rangeProblems.${problem}`, { days: MOST_DAYS_IN_RANGE })}
				</Callout>
			)}
			{nothingInReach && <Callout>{t(`${key}.hidden`)}</Callout>}
			<ReportSection id="staffing" read={staffing}>
				{(rules) => <StaffingTable rules={rules} />}
			</ReportSection>
			<ReportSection id="overtime" read={overtime}>
				{(answer) => (
					<OvertimeTable
						departments={answer.departments}
						nearSharePercent={answer.nearSharePercent}
					/>
				)}
			</ReportSection>
			<ReportSection id="stability" read={changes}>
				{(departments) => <RosterStabilityTable departments={departments} />}
			</ReportSection>
		</div>
	);
};
