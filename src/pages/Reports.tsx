import { getRouteApi } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { formattingLocale } from "@/common/formattingLocale";
import type { FunctionComponent } from "@/common/types";
import { ColumnChart } from "@/components/charts/bar/ColumnChart";
import { SegmentedBar } from "@/components/charts/bar/SegmentedBar";
import { DatePicker } from "@/components/forms/DatePicker";
import { Callout } from "@/components/ui/Callout";
import { Tab, TabList, Tabs } from "@/components/ui/Tabs";
import type { DayRange } from "@/features/dashboard/api";
import type { RosterChangeDepartment } from "@/features/reports/api";
import { OvertimeTable } from "@/features/reports/OvertimeTable";
import {
	changeSegments,
	OVERTIME_SERIES,
	overtimeByMonthGroups,
	SHORT_SERIES,
	shortByWeekGroups,
	spansSeveralMonths,
	type UnitGrouping,
} from "@/features/reports/reportCharts";
import {
	overtimeFinding,
	stabilityFinding,
	staffingFinding,
	type Finding,
} from "@/features/reports/reportFindings";
import { ReportSection } from "@/features/reports/ReportSection";
import {
	monthsOf,
	MOST_DAYS_IN_RANGE,
	presetOf,
	presetRange,
	RANGE_PRESETS,
	rangeOf,
	rangeProblemOf,
} from "@/features/reports/reportsSearch";
import { REPORTS_UNIT_RULES } from "@/features/reports/reportsUnitRules";
import { RosterStabilityTable } from "@/features/reports/RosterStabilityTable";
import { StaffingTable } from "@/features/reports/StaffingTable";
import {
	useReportOvertime,
	useReportShortages,
	useReportStaffing,
	useRosterChanges,
} from "@/features/reports/useReportsReads";
import { DepartmentFilter } from "@/features/workspace/DepartmentFilter";
import { REPORT_READ_KEYS } from "@/features/workspace/permissionKeys";
import { selectedUnits } from "@/features/workspace/unitSelection";
import { unitSelectionOf } from "@/features/workspace/unitSearch";
import { useCurrentCompanyId } from "@/features/workspace/useCurrentCompany";
import { useUnitSelection } from "@/features/workspace/useUnitSelection";

const key = "reports";

const route = getRouteApi("/_authenticated/_app/reports");

/**
 * Reports: three questions over a range of days in the header's Branch,
 * narrowed to a Department from the filter. Are we staffed, is overtime
 * under control, are published rosters stable. Each section's heading states
 * what its answer shows; its table follows. The range and units are kept in
 * the URL.
 */
export const Reports = (): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const language = formattingLocale(i18n);
	// A week's Monday and a month, as the charts' columns name them.
	const dayMonth = new Intl.DateTimeFormat(language, {
		day: "numeric",
		month: "short",
	});
	const monthName = new Intl.DateTimeFormat(language, { month: "short" });
	const companyId = useCurrentCompanyId();
	const navigate = route.useNavigate();
	const search = route.useSearch();
	const resolved = useUnitSelection(
		companyId,
		REPORT_READ_KEYS,
		unitSelectionOf(search),
		REPORTS_UNIT_RULES
	);
	const units = selectedUnits(resolved);
	const today = new Date();
	const range = rangeOf(search, today);
	const preset = presetOf(range, today);
	const problem = rangeProblemOf(range);
	const asked = problem === undefined;
	const staffing = useReportStaffing(companyId, units, range, asked);
	const shortages = useReportShortages(companyId, units, range, asked);
	// Across the company the charts compare Branches; within one Branch, its Departments.
	const grouping: UnitGrouping = units.branchId ? "department" : "branch";
	const overtime = useReportOvertime(companyId, units, monthsOf(range), asked);
	const changes = useRosterChanges(companyId, units, range, asked);
	const nothingInReach = [staffing, overtime, changes].every(
		(read) => read.status === "hidden"
	);
	const chooseRange = (chosen: DayRange): void => {
		void navigate({
			search: (previous) => ({ ...previous, ...chosen }),
		});
	};
	/** The stability finding, its reason named in words. */
	const stabilityFindingOf = (
		departments: Array<RosterChangeDepartment>
	): Finding => {
		const finding = stabilityFinding(departments);
		const reason = finding.values?.["reason"];
		return reason === undefined
			? finding
			: {
					...finding,
					values: {
						...finding.values,
						reason: t(`${key}.stability.reasonNames.${String(reason)}`, {
							defaultValue: t(`${key}.stability.reasonNames.OTHER`),
						}),
					},
				};
	};
	return (
		<div className="flex flex-col gap-8">
			<div className="flex flex-col gap-2">
				<h1 className="text-[2rem] leading-10 font-medium text-neutral-900">
					{t("shell.navigation.reports")}
				</h1>
				<p className="text-sm text-neutral-800">{t(`${key}.subtitle`)}</p>
			</div>
			<div className="flex flex-col gap-4 lg:flex-row lg:items-end">
				<Tabs
					selectedIndex={RANGE_PRESETS.indexOf(preset)}
					onChange={(index) => {
						const chosen = RANGE_PRESETS[index];
						if (chosen && chosen !== "custom")
							chooseRange(presetRange(chosen, today));
					}}
				>
					<TabList aria-label={t(`${key}.presets.label`)} className="-ml-1">
						{RANGE_PRESETS.map((each) => (
							<Tab key={each}>{t(`${key}.presets.${each}`)}</Tab>
						))}
					</TabList>
				</Tabs>
				<div className="w-full sm:w-72">
					<DatePicker
						label={t(`${key}.range`)}
						value={{ start: range.from, end: range.to }}
						onChange={({ start, end }) => {
							if (start && end) chooseRange({ from: start, to: end });
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
			<ReportSection
				findingOf={staffingFinding}
				id="staffing"
				isEmpty={(rules) => rules.length === 0}
				rangeInvalid={!asked}
				read={staffing}
			>
				{(rules) => (
					<>
						{shortages.status === "ready" && (
							<ColumnChart
								label={t(`${key}.staffing.chart.label`)}
								groups={shortByWeekGroups(
									shortages.data,
									rules,
									range,
									grouping,
									(monday) => dayMonth.format(new Date(`${monday}T00:00:00`))
								)}
								series={[
									{
										id: SHORT_SERIES.tooFew,
										label: t(`${key}.staffing.chart.tooFew`),
										colour: "inkBlue900",
									},
									{
										id: SHORT_SERIES.oneOff,
										label: t(`${key}.staffing.chart.oneOff`),
										colour: "inkBlue200",
									},
								]}
							/>
						)}
						<StaffingTable rules={rules} />
					</>
				)}
			</ReportSection>
			<ReportSection
				findingOf={(answer) => overtimeFinding(answer.departments)}
				id="overtime"
				isEmpty={(answer) => answer.departments.length === 0}
				rangeInvalid={!asked}
				read={overtime}
			>
				{(answer) => (
					<>
						<ColumnChart
							label={t(`${key}.overtime.chart.label`)}
							groups={overtimeByMonthGroups(
								answer.departments,
								grouping,
								(month) => monthName.format(new Date(`${month}-01T00:00:00`))
							)}
							series={[
								{
									id: OVERTIME_SERIES.latest,
									label: t(`${key}.overtime.chart.latest`),
									colour: "inkBlue900",
								},
								...(spansSeveralMonths(answer.departments)
									? [
											{
												id: OVERTIME_SERIES.earlier,
												label: t(`${key}.overtime.chart.earlier`),
												colour: "inkBlue200" as const,
											},
										]
									: []),
							]}
						/>
						<OvertimeTable
							departments={answer.departments}
							nearSharePercent={answer.nearSharePercent}
						/>
					</>
				)}
			</ReportSection>
			<ReportSection
				findingOf={stabilityFindingOf}
				id="stability"
				isEmpty={(departments) => departments.length === 0}
				rangeInvalid={!asked}
				read={changes}
			>
				{(departments) => (
					<>
						{/* Every reason across the units in view, with the legend the table's bars share. */}
						<SegmentedBar
							legend
							label={t(`${key}.stability.chart.label`)}
							segments={changeSegments(
								departments.flatMap((row) => row.reasons),
								(reason) =>
									t(`${key}.stability.reasonNames.${reason}`, {
										defaultValue: t(`${key}.stability.reasonNames.OTHER`),
									})
							)}
						/>
						<RosterStabilityTable departments={departments} />
					</>
				)}
			</ReportSection>
		</div>
	);
};
