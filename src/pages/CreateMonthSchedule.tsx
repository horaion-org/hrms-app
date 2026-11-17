import { useQueries, useQuery } from "@tanstack/react-query";
import { mondayOf } from "@/common/weeks";
import { datesPlanQuery } from "@/features/scheduling/dates/api";
import { useGenerateDates } from "@/features/scheduling/dates/useGenerateDates";
import { formatDay } from "@/common/formatDay";
import {
	datesIn,
	datesProblemOf,
	daysBeforeOf,
} from "@/features/scheduling/dates/datesSetup";
import { startingDaysQuery } from "@/features/scheduling/startingContext/api";
import { unansweredDays } from "@/features/scheduling/startingContext/startingGrid";
import { formatPeriod, periodStartingOn } from "@/features/scheduling/periods";
import { Navigate, useNavigate, useSearch } from "@tanstack/react-router";
import dayjs from "dayjs";
import type { TFunction } from "i18next";
import { useCallback, useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { formattingLocale } from "@/common/formattingLocale";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { ErrorText } from "@/components/ui/ErrorText";
import { ArrowLeftIcon, ArrowRightIcon } from "@/components/ui/Icon";
import { Stepper, StepperStep } from "@/components/ui/Stepper";
import { constraintsQuery } from "@/features/scheduling/constraints/api";
import { useConstraintOptions } from "@/features/scheduling/constraints/useConstraintOptions";
import { OpeningHoursCallout } from "@/features/scheduling/hours/OpeningHoursCallout";
import { startsAfterFirst } from "@/features/scheduling/hours/openingSummary";
import { MonthChoiceDialog } from "@/features/scheduling/MonthChoiceDialog";
import {
	monthGenerationCheckQuery,
	scheduleMonthQuery,
	scheduleMonthSummariesQuery,
	type MonthWeek,
} from "@/features/scheduling/months/api";
import { BeforeGeneratePanel } from "@/features/scheduling/months/BeforeGeneratePanel";
import {
	MONTH_SETUP_DEFAULTS,
	refusedWeeks,
	startingWeekOf,
	startingWeeksOf,
	weekNameOf,
	weeksToCreate,
	type MonthChoices,
	type MonthSetup,
} from "@/features/scheduling/months/monthGeneration";
import {
	formatMonthName,
	formatWeekDates,
	monthChoicesFrom,
	monthOf,
	summaryRange,
} from "@/features/scheduling/months/monthWeeks";
import { weekRangeText } from "@/features/scheduling/months/monthCopy";
import { hasRoster } from "@/features/scheduling/months/weekStateLooks";
import {
	badgeOf,
	chosenWeeksNow,
	defaultMonthOf,
	defaultTicksOf,
	tickableWeeksOf,
	tickedRangesOf,
} from "@/features/scheduling/months/weekTicks";
import { withRefusedWeeks } from "@/features/scheduling/months/refusedWeeksState";
import { useGenerateMonth } from "@/features/scheduling/months/useGenerateMonth";
import { isoDateIn } from "@/features/scheduling/roster/roster";
import {
	type DatesChoice,
	MonthSetupStep,
	type MonthSetupValues,
} from "@/features/scheduling/MonthSetupStep";
import {
	fixLinkOf,
	gateOf,
	type Gate,
} from "@/features/scheduling/readiness/readinessCopy";
import {
	ReadinessGateCallout,
	type FixLink,
} from "@/features/scheduling/readiness/ReadinessGateCallout";
import { useSchedulingReadiness } from "@/features/scheduling/readiness/useSchedulingReadiness";
import { scheduleQuery } from "@/features/scheduling/schedules/api";
import {
	datesGenerationRefusal,
	monthGenerationRefusal,
	scheduleRefusalMessage,
} from "@/features/scheduling/schedules/scheduleRefusal";
import {
	useSchedule,
	useScheduleActions,
} from "@/features/scheduling/schedules/useSchedule";
import { SCHEDULING_UNIT_RULES } from "@/features/scheduling/schedules/schedulesUnitRules";
import { departmentShiftsQuery } from "@/features/scheduling/shifts/api";
import { StartingContextCallout } from "@/features/scheduling/startingContext/StartingContextCallout";
import {
	StartingContextSection,
	type StartingPointDialog,
} from "@/features/scheduling/startingContext/StartingContextSection";
import { StepActions } from "@/features/scheduling/StepActions";
import { isScheduleStep, SCHEDULE_STEPS } from "@/features/scheduling/steps";
import {
	allOf,
	leftOutCount,
	type WeekChoiceIds,
} from "@/features/scheduling/weekChoice";
import {
	WeekChoiceSummary,
	type SetupLink,
} from "@/features/scheduling/WeekChoiceSummary";
import { workspaceQuery } from "@/features/workspace/api";
import {
	SCHEDULE_CREATE_KEYS,
	type PermissionKey,
} from "@/features/workspace/permissionKeys";
import { retry } from "@/features/workspace/retry";
import { departmentScope } from "@/features/workspace/scopes";
import { useAccess } from "@/features/workspace/useAccess";
import { useCurrentCompanyId } from "@/features/workspace/useCurrentCompany";
import { useUnitSelection } from "@/features/workspace/useUnitSelection";
import { departmentChoices } from "@/features/workspace/unitChoices";

const key = "scheduling.months.create";

/**
 * What the month's weeks use, as one line: every week everything, or how
 * many weeks use everything and which leave something out.
 */
const monthUsesLine = (
	t: TFunction,
	weeks: Array<{ label: string; leftOut: number }>,
	everything: WeekChoiceIds,
	department: string,
	language: string
): string => {
	const changed = weeks.filter((week) => week.leftOut > 0);
	if (changed.length === 0)
		return t(`${key}.usesEveryWeek`, {
			shifts: t("scheduling.week.shiftsAll", {
				count: everything.shiftIds.length,
			}),
			constraints: t("scheduling.week.constraintCount", {
				count: everything.constraintIds.length,
			}),
			department,
		});
	return t(`${key}.usesSomeWeeks`, {
		count: weeks.length - changed.length,
		total: weeks.length,
		department,
		changed: new Intl.ListFormat(language, { type: "conjunction" }).format(
			changed.map((week) =>
				t(`${key}.changedWeek`, { week: week.label, count: week.leftOut })
			)
		),
	});
};

/**
 * Create schedules for a month: Setup and Generate, as the week
 * wizard's steps. The URL names the step, the Department and the month;
 * the setup and the per-week choices stay in the page, and nothing is
 * saved before Generate, which posts the month through useGenerateMonth and
 * lands on the month page with the weeks it refused. A later step without
 * a setup (a reload) goes back to Setup. Allocations and demand stay in the
 * page until their API exists, as in the week wizard.
 */
export const CreateMonthSchedule = (): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const language = formattingLocale(i18n);
	const companyId = useCurrentCompanyId();
	const navigate = useNavigate();
	const access = useAccess();
	const workspace = useQuery({ ...workspaceQuery, retry });
	const search = useSearch({ from: "/_authenticated/_app/scheduling_/new" });
	const step = isScheduleStep(search.step) ? search.step : "setup";
	// The header's Branch, resolved as the header resolves it: the month's Departments are its own.
	const headerBranchId = useUnitSelection(
		companyId,
		SCHEDULE_CREATE_KEYS,
		{ branchId: search.branch },
		SCHEDULING_UNIT_RULES
	).branch?.branchId;
	// Today is read once, so the offered months hold still while the page is open.
	const [today] = useState(() => new Date());
	const todayIso = dayjs(today).format("YYYY-MM-DD");
	const months = monthChoicesFrom(today);
	const [setup, setSetup] = useState<MonthSetupValues>();
	const setupDefaults: MonthSetupValues = setup ?? {
		departmentId: search.department ?? "",
		scheduleFor: search.for ?? "month",
		firstDay: search.firstDay ?? "",
		lastDay: search.lastDay ?? "",
		name: "",
		month:
			search.month && months.includes(search.month)
				? search.month
				: (defaultMonthOf(months, todayIso, []) ?? ""),
		...MONTH_SETUP_DEFAULTS,
	};
	// The Department and month the Setup form holds, before it is submitted.
	const [departmentId, setDepartmentId] = useState(setupDefaults.departmentId);
	const [month, setMonth] = useState(setupDefaults.month);
	// Each week's choice, by Monday; a week without one uses everything.
	const [choices, setChoices] = useState<MonthChoices>({});
	// The Mondays the manager ticked; undefined means the defaults of the month's weeks.
	const [ticks, setTicks] = useState<Array<string>>();
	const [choosing, setChoosing] = useState(false);
	// The settings the Setup form holds, for the first week when it is saved before the form is.
	const [settings, setSettings] = useState<MonthSetup>({
		includeLeave: setupDefaults.includeLeave,
	});
	// The first week's draft this page just saved, and which of its dialogs opens once.
	const [savedStart, setSavedStart] = useState<{
		scheduleId: string;
		dialog: StartingPointDialog;
	}>();
	const [problem, setProblem] = useState("");
	const setupFormId = useId();
	// Another Department or month has other weeks: its choices and ticks start again from the defaults.
	const chooseDepartment = useCallback(
		(next: string): void => {
			if (next === departmentId) return;
			setDepartmentId(next);
			setChoices({});
			setTicks(undefined);
		},
		[departmentId]
	);
	const chooseMonth = useCallback(
		(next: string): void => {
			if (next === month) return;
			setMonth(next);
			setChoices({});
			setTicks(undefined);
		},
		[month]
	);

	const choice =
		workspace.data && departmentId
			? departmentChoices(workspace.data, companyId, SCHEDULE_CREATE_KEYS, {
					activeOnly: true,
				}).find((candidate) => candidate.departmentId === departmentId)
			: undefined;
	const unit = choice && {
		branchId: choice.branchId,
		departmentId: choice.departmentId,
	};
	const scope = unit && departmentScope(unit.departmentId);
	const allowedHere = (permission: PermissionKey): boolean =>
		scope !== undefined && access.can(permission, scope);
	const readsShifts = allowedHere("shift:read");
	const readsConstraints = allowedHere("constraint:read");
	const listsHidden = unit !== undefined && (!readsShifts || !readsConstraints);
	const scheduleMonth = useQuery(
		scheduleMonthQuery(
			companyId,
			departmentId,
			month,
			unit !== undefined && month !== ""
		)
	);
	// The Department's months, to suggest the first with a week to schedule; not when the URL names the month.
	const summaries = useQuery(
		scheduleMonthSummariesQuery(
			companyId,
			{ branchId: unit?.branchId, departmentId: unit?.departmentId },
			summaryRange(today),
			unit !== undefined &&
				search.month === undefined &&
				allowedHere("schedule:read")
		)
	);
	const suggestedMonth =
		summaries.data &&
		defaultMonthOf(
			months,
			todayIso,
			summaries.data.filter((summary) => summary.departmentId === departmentId)
		);
	// "Started" follows the branch's today, as the API's "over" does; the browser's date only without its time zone.
	const branchToday = scheduleMonth.data?.timeZone
		? isoDateIn(scheduleMonth.data.timeZone, today)
		: todayIso;
	const tickable =
		scheduleMonth.data &&
		tickableWeeksOf(scheduleMonth.data.weeks, branchToday);
	// What is ticked, of the weeks that can still be ticked: the manager's ticks, or the defaults.
	// The month is read again while the wizard is open; Generate names what changed since Setup.
	const chosenNow = chosenWeeksNow(
		tickable ?? [],
		ticks ?? (tickable ? defaultTicksOf(tickable) : [])
	);
	const ticked = chosenNow.kept;
	const shifts = useQuery(departmentShiftsQuery(companyId, unit, readsShifts));
	const constraints = useQuery(
		constraintsQuery(companyId, unit, readsConstraints)
	);
	const constraintOptions = useConstraintOptions(companyId, unit);
	const generation = useGenerateMonth(companyId, scheduleMonth.data, ticked);
	const scheduleActions = useScheduleActions(companyId);
	// Where everyone starts is set on the first ticked week without a roster.
	const startingWeek = scheduleMonth.data
		? startingWeekOf(scheduleMonth.data, ticked)
		: undefined;
	// Each later ticked week with nothing before it (after a gap) is asked for its days before, not for hours.
	// Dates (API ADR-0114): what Setup schedules for and the chosen days; their plan once they are valid.
	const [datesChoice, setDatesChoice] = useState<DatesChoice>({
		scheduleFor: setupDefaults.scheduleFor,
		firstDay: setupDefaults.firstDay,
		lastDay: setupDefaults.lastDay,
		name: setupDefaults.name,
	});
	const byDates = datesChoice.scheduleFor === "dates";
	const datesValid =
		byDates &&
		unit !== undefined &&
		datesProblemOf(datesChoice.firstDay, datesChoice.lastDay, branchToday) ===
			undefined;
	const datesPlan = useQuery(
		datesPlanQuery(
			companyId,
			departmentId,
			datesChoice.firstDay,
			datesChoice.lastDay,
			datesValid && allowedHere("schedule:read")
		)
	);
	const plan = datesValid ? datesPlan.data : undefined;
	// The first week with new days: where everyone starts, and whose earlier days are asked about.
	const datesStart = plan?.weeks.find((week) => week.newFrom !== null);
	const datesDraftId =
		datesStart?.action === "GENERATE" ? (datesStart.draftId ?? "") : "";
	const datesDraft = useQuery(
		scheduleQuery(
			companyId,
			unit,
			datesDraftId,
			datesDraftId !== "" && allowedHere("schedule:read")
		)
	);
	// Owner answer 2: the days of the first week before its first generated day that nobody knows are asked
	// about (were rest days given?), and taken as days nobody worked if left unknown. A started week is
	// generated from today; dates name those days in their plan.
	const restDaysFrom = byDates
		? (datesStart?.newFrom ?? undefined)
		: startingWeek && startingWeek.periodStart < branchToday
			? branchToday
			: undefined;
	const askedRestDays = byDates
		? (plan?.notRosteredBefore ?? undefined)
		: startingWeek && restDaysFrom
			? daysBeforeOf(startingWeek.periodStart, restDaysFrom)
			: undefined;
	const startingDraftId = byDates
		? datesDraftId
		: startingWeek?.state === "DRAFT"
			? (startingWeek.scheduleId ?? "")
			: "";
	const startingDays = useQuery(
		startingDaysQuery(
			companyId,
			unit,
			startingDraftId,
			startingDraftId !== "" && askedRestDays !== undefined
		)
	);
	const unknownRestDays = !askedRestDays
		? []
		: startingDays.data
			? unansweredDays(startingDays.data, askedRestDays)
			: datesIn(askedRestDays);
	const laterStartingWeeks = scheduleMonth.data
		? startingWeeksOf(scheduleMonth.data, ticked).filter(
				(week) => week !== startingWeek
			)
		: [];
	const laterDraftIds = laterStartingWeeks.flatMap((week) =>
		week.state === "DRAFT" && week.scheduleId ? [week.scheduleId] : []
	);
	// The later weeks' saved drafts, read for their day-off types.
	const laterDrafts = useQueries({
		queries: laterDraftIds.map((draftId) =>
			scheduleQuery(companyId, unit, draftId, allowedHere("schedule:read"))
		),
	});
	// A saved first week's draft, read for its day-off types.
	const startingDraft = useSchedule(
		companyId,
		unit,
		startingWeek?.state === "DRAFT"
			? (startingWeek.scheduleId ?? undefined)
			: undefined
	);
	const weekBefore =
		startingWeek &&
		dayjs(startingWeek.periodStart).subtract(7, "day").format("YYYY-MM-DD");
	// The week before may sit in the month before; its state comes from that month's read.
	const monthBefore = useQuery(
		scheduleMonthQuery(
			companyId,
			departmentId,
			weekBefore ? monthOf(weekBefore) : month,
			unit !== undefined && startingWeek?.state === "NOT_GENERATED"
		)
	);
	const mayGenerate = allowedHere("schedule:generate");
	// A dates run's panel checks the first day's month (its leave counts that month).
	const checkMonth = byDates ? monthOf(datesChoice.firstDay) : month;
	const check = useQuery(
		monthGenerationCheckQuery(
			companyId,
			departmentId,
			checkMonth,
			mayGenerate && step === "generate" && checkMonth !== ""
		)
	);
	const datesGeneration = useGenerateDates(companyId, departmentId);
	const readiness = useSchedulingReadiness(
		companyId,
		{ departmentId: unit?.departmentId },
		unit !== undefined
	);
	const readinessRow =
		readiness.status === "ready"
			? readiness.rows.find((row) => row.departmentId === unit?.departmentId)
			: undefined;

	const current = SCHEDULE_STEPS.indexOf(step);
	if (current > 0 && setup === undefined)
		return (
			<Navigate
				replace
				to="/scheduling/new"
				search={{
					step: "setup",
					...(search.department ? { department: search.department } : {}),
					...(search.month ? { month: search.month } : {}),
				}}
			/>
		);

	const goTo = (index: number, values = setup): void => {
		setProblem("");
		void navigate({
			to: "/scheduling/new",
			search: {
				step: SCHEDULE_STEPS[index] ?? "setup",
				...(values
					? { department: values.departmentId, month: values.month }
					: {}),
			},
		});
	};
	const monthName = month ? formatMonthName(month, language) : "";
	const everything =
		shifts.data && constraints.data
			? allOf(shifts.data, constraints.data)
			: undefined;
	// The weeks the run creates, each with its own choice: the ticked new weeks, or the dates' new parts.
	const weeks: Array<Pick<MonthWeek, "periodStart" | "periodEnd">> = byDates
		? (plan?.weeks ?? []).filter(
				(week) => week.action === "CREATE_AND_GENERATE"
			)
		: scheduleMonth.data
			? weeksToCreate(scheduleMonth.data, ticked)
			: [];
	const weekLabel = (
		week: Pick<MonthWeek, "periodStart" | "periodEnd">
	): string =>
		formatWeekDates({ start: week.periodStart, end: week.periodEnd }, language);
	const choiceOf = (
		week: Pick<MonthWeek, "periodStart">
	): WeekChoiceIds | undefined => choices[week.periodStart] ?? everything;
	// The Scheduling tab that edits the Department, where its list may be read.
	const editLink = (
		view: SetupLink["search"]["view"],
		readKey: PermissionKey
	): SetupLink | undefined =>
		unit && allowedHere(readKey)
			? {
					to: "/scheduling",
					search: {
						view,
						branch: unit.branchId,
						department: unit.departmentId,
					},
				}
			: undefined;
	const editShifts = editLink("shifts", "shift:read");
	const editConstraints = editLink("constraints", "constraint:read");
	const canFix = {
		shifts: allowedHere("shift:create"),
		constraints: allowedHere("constraint:create"),
	};
	// The month stops at Setup while its Department can't roster anyone, as a new week does.
	const setupGate = readinessRow
		? gateOf(readinessRow, canFix, "setup")
		: undefined;
	const fixLink = (gate: Gate | undefined): FixLink | undefined =>
		gate?.linkTo &&
		unit &&
		(gate.linkTo === "shifts" ? editShifts : editConstraints)
			? {
					to: "/scheduling",
					search: fixLinkOf(gate.linkTo, unit, { next: "create", month }),
				}
			: undefined;
	const usesLine =
		choice === undefined
			? undefined
			: listsHidden
				? t(`${key}.everything`, { department: choice.name })
				: !everything || !scheduleMonth.data || weeks.length === 0
					? undefined
					: monthUsesLine(
							t,
							weeks.map((week) => ({
								label: weekLabel(week),
								leftOut: leftOutCount(
									choiceOf(week) ?? everything,
									shifts.data ?? [],
									constraints.data ?? []
								),
							})),
							everything,
							choice.name,
							language
						);
	const weekBeforeRostered = monthBefore.data?.weeks.some(
		(week) => week.periodStart === weekBefore && hasRoster(week.state)
	);
	// Saves the first week as a draft, with its choice and the Setup's settings, to add its starting point.
	const saveStartingWeek = async (
		monday: string,
		dialog: StartingPointDialog
	): Promise<void> => {
		if (!unit || !everything) return;
		setProblem("");
		const weekChoice = choices[monday] ?? everything;
		try {
			const created = await scheduleActions.create.mutateAsync({
				unit,
				body: {
					name: weekNameOf(monday),
					periodStart: monday,
					// A started week is generated from today on (owner, API ADR-0115): its draft covers today to Sunday.
					...(monday < branchToday
						? {
								coveredFrom: branchToday,
								coveredTo: periodStartingOn(monday).end,
							}
						: {}),
					includeLeave: settings.includeLeave,
					includedShiftIds: weekChoice.shiftIds,
					includedConstraintIds: weekChoice.constraintIds,
				},
			});
			setSavedStart({ scheduleId: created.scheduleId, dialog });
		} catch (error) {
			setProblem(scheduleRefusalMessage(error, true, t));
		}
	};
	// Saves a week's draft, then opens one of its dialogs; none without the right to.
	const addToWeek = (
		week: MonthWeek | undefined,
		dialog: StartingPointDialog
	): (() => void) | undefined =>
		week &&
		allowedHere("schedule:create") &&
		allowedHere("schedule:update") &&
		everything
			? (): void => {
					void saveStartingWeek(week.periodStart, dialog);
				}
			: undefined;
	const openOnStartOf = (
		scheduleId: string
	): StartingPointDialog | undefined =>
		savedStart?.scheduleId === scheduleId ? savedStart.dialog : undefined;
	const startingPoint =
		!unit || !startingWeek ? undefined : startingWeek.state === "DRAFT" &&
		  startingWeek.scheduleId ? (
			<StartingContextSection
				canEdit={allowedHere("schedule:update")}
				companyId={companyId}
				openOnStart={openOnStartOf(startingWeek.scheduleId)}
				scheduleId={startingWeek.scheduleId}
				unit={unit}
				nonWorkingDayTypes={
					startingDraft.status === "ready"
						? startingDraft.schedule.nonWorkingDayTypes
						: []
				}
			/>
		) : monthBefore.isPending ? undefined : (
			// Before the first week's draft exists: the week page's two notices; each button saves the draft first.
			<div className="flex flex-col gap-4">
				<StartingContextCallout
					adding={scheduleActions.create.isPending}
					enteredCount={0}
					previous={
						weekBefore && weekBeforeRostered
							? { kind: "carried", periodStart: weekBefore, uncovered: 0 }
							: { kind: "none" }
					}
					onAdd={addToWeek(startingWeek, "days")}
				/>
				{startsAfterFirst(startingWeek.periodStart) && (
					<OpeningHoursCallout
						adding={scheduleActions.create.isPending}
						asOf={startingWeek.periodStart}
						hours={{ kind: "notRead", carried: weekBeforeRostered === true }}
						onAdd={addToWeek(startingWeek, "hours")}
					/>
				)}
			</div>
		);
	// With later weeks asked too, each set of questions sits under its week's dates.
	const firstWeekDates = startingWeek && laterStartingWeeks.length > 0 && (
		<p className="text-sm font-semibold text-neutral-900">
			{weekLabel(startingWeek)}
		</p>
	);
	const laterStartingPoints =
		unit &&
		laterStartingWeeks.map((week) => (
			<div key={week.periodStart} className="flex flex-col gap-4">
				<p className="text-sm font-semibold text-neutral-900">
					{weekLabel(week)}
				</p>
				{week.state === "DRAFT" && week.scheduleId ? (
					<StartingContextSection
						canEdit={allowedHere("schedule:update")}
						companyId={companyId}
						openOnStart={openOnStartOf(week.scheduleId)}
						scheduleId={week.scheduleId}
						showsHours={false}
						unit={unit}
						nonWorkingDayTypes={
							laterDrafts[laterDraftIds.indexOf(week.scheduleId)]?.data
								?.nonWorkingDayTypes ?? []
						}
					/>
				) : (
					// Before the week's draft exists: the button saves it first, then opens its grid.
					<StartingContextCallout
						adding={scheduleActions.create.isPending}
						enteredCount={0}
						previous={{ kind: "none" }}
						onAdd={addToWeek(week, "days")}
					/>
				)}
			</div>
		));
	const restDaysText = new Intl.ListFormat(language, {
		type: "conjunction",
	}).format(unknownRestDays.map((date) => formatDay(date, language)));
	// Dates from mid-week with nothing rostered before: the first new part's "Before this week", as the
	// month's first week has it; the button saves that part as a draft covering its new days, which the
	// run then generates.
	const saveDatesStart = async (): Promise<void> => {
		if (!unit || !everything || !datesStart?.newFrom || !datesStart.newTo)
			return;
		setProblem("");
		const weekChoice = choices[datesStart.periodStart] ?? everything;
		try {
			const created = await scheduleActions.create.mutateAsync({
				unit,
				body: {
					name: datesChoice.name.trim() || weekNameOf(datesStart.periodStart),
					periodStart: datesStart.periodStart,
					coveredFrom: datesStart.newFrom,
					coveredTo: datesStart.newTo,
					includeLeave: settings.includeLeave,
					includedShiftIds: weekChoice.shiftIds,
					includedConstraintIds: weekChoice.constraintIds,
				},
			});
			setSavedStart({ scheduleId: created.scheduleId, dialog: "days" });
		} catch (error) {
			setProblem(scheduleRefusalMessage(error, true, t));
		}
	};
	const datesStartingPoint =
		!unit || !plan?.notRosteredBefore ? undefined : datesDraftId !== "" ? (
			<StartingContextSection
				canEdit={allowedHere("schedule:update")}
				companyId={companyId}
				nonWorkingDayTypes={datesDraft.data?.nonWorkingDayTypes ?? []}
				openOnStart={openOnStartOf(datesDraftId)}
				scheduleId={datesDraftId}
				showsHours={false}
				unit={unit}
			/>
		) : (
			<StartingContextCallout
				adding={scheduleActions.create.isPending}
				enteredCount={0}
				previous={{ kind: "none" }}
				onAdd={
					allowedHere("schedule:create") &&
					allowedHere("schedule:update") &&
					everything
						? (): void => {
								void saveDatesStart();
							}
						: undefined
				}
			/>
		);
	// The first week saved as a draft keeps its own choice, changed on its own page.
	const savedDraftLine =
		startingWeek?.state === "DRAFT"
			? t(`${key}.savedDraft`, { week: weekLabel(startingWeek) })
			: undefined;
	const usesSummary = usesLine && (
		<WeekChoiceSummary
			editConstraints={editConstraints}
			editShifts={editShifts}
			line={usesLine}
			actionLabel={
				!listsHidden && weeks.length > 0 ? t(`${key}.choosePerWeek`) : undefined
			}
			onAction={() => {
				setChoosing(true);
			}}
		/>
	);
	// Why Setup's Next waits: the gate, lists the person may not see, lists still loading or no week ticked (no note).
	const listsWaiting =
		unit !== undefined &&
		!listsHidden &&
		(everything === undefined || scheduleMonth.data === undefined);
	// The list itself says to tick a week, so Next waits without a note.
	const nothingTicked = tickable !== undefined && ticked.length === 0;
	const setupNextNote = setupGate
		? t(setupGate.nextNoteKey, { department: setupGate.department })
		: listsHidden && choice
			? t("scheduling.week.listsHiddenNote", { department: choice.name })
			: listsWaiting ||
				  (byDates
						? !plan || plan.refusal !== null || plan.newDays === 0
						: nothingTicked)
				? ""
				: undefined;
	// The Generate step names the ticked weeks, joined where they touch, as Setup's list does.
	const tickedHint = t("scheduling.months.generate.panel.hintChosen", {
		count: ticked.length,
		ranges: new Intl.ListFormat(language, { type: "conjunction" }).format(
			tickedRangesOf(ticked).map((range) => weekRangeText(range, language, t))
		),
	});
	// The days a dates run generates, from its first new day to its last.
	const newDatesWeeks =
		plan?.weeks.filter((week) => week.newFrom !== null) ?? [];
	const firstNewDay = newDatesWeeks[0]?.newFrom;
	const lastNewDay = newDatesWeeks[newDatesWeeks.length - 1]?.newTo;
	const datesHint =
		plan && firstNewDay && lastNewDay
			? t("scheduling.dates.generate.hint", {
					count: plan.newDays,
					range: formatPeriod(
						{ start: firstNewDay, end: lastNewDay },
						language
					),
				})
			: "";
	const generateDatesNow = async (values: MonthSetupValues): Promise<void> => {
		if (!plan || !everything) return;
		setProblem("");
		try {
			const answer = await datesGeneration.generate({
				firstDay: values.firstDay,
				lastDay: values.lastDay,
				...(values.name.trim() === "" ? {} : { name: values.name.trim() }),
				includeLeave: values.includeLeave,
				newWeeks: plan.weeks
					.filter((week) => week.action === "CREATE_AND_GENERATE")
					.map((week) => {
						const weekChoice = choices[week.periodStart] ?? everything;
						return {
							periodStart: week.periodStart,
							includedShiftIds: weekChoice.shiftIds,
							includedConstraintIds: weekChoice.constraintIds,
						};
					}),
			});
			await navigate({
				to: "/scheduling/months/$month",
				params: { month: monthOf(values.firstDay) },
				search: { department: values.departmentId },
				state: withRefusedWeeks(refusedWeeks(answer)),
			});
		} catch (error) {
			setProblem(datesGenerationRefusal(error, t));
		}
	};
	const generate = async (): Promise<void> => {
		if (!setup) return;
		if (setup.scheduleFor === "dates") {
			await generateDatesNow(setup);
			return;
		}
		setProblem("");
		try {
			const answer = await generation.generate({
				choices,
				setup: {
					includeLeave: setup.includeLeave,
				},
			});
			await navigate({
				to: "/scheduling/months/$month",
				params: { month: setup.month },
				search: { department: setup.departmentId },
				state: withRefusedWeeks(refusedWeeks(answer)),
			});
		} catch (error) {
			setProblem(monthGenerationRefusal(error, t));
		}
	};
	const back =
		current > 0
			? (): void => {
					goTo(current - 1);
				}
			: undefined;

	return (
		<>
			<Button
				leadingIcon={<ArrowLeftIcon />}
				to="/scheduling"
				variant="textlink"
			>
				{t("scheduling.create.back")}
			</Button>
			<h1 className="mt-4 text-4xl font-medium text-neutral-900">
				{t("scheduling.months.create.title")}
			</h1>
			<p className="mt-3 text-sm text-neutral-800">
				{t("scheduling.months.create.subtitle")}
			</p>
			<Stepper
				className="mt-12"
				currentStep={current}
				onStepClick={(index) => {
					if (setup) goTo(index);
				}}
			>
				{SCHEDULE_STEPS.map((name, index) => (
					<StepperStep
						key={name}
						completed={setup !== undefined && index < current}
						label={t(`scheduling.create.steps.${name}`)}
					/>
				))}
			</Stepper>
			<div className="mt-12">
				{step === "setup" && (
					<MonthSetupStep
						branchId={headerBranchId}
						companyId={companyId}
						defaultValues={setupDefaults}
						formId={setupFormId}
						months={months}
						suggestedMonth={suggestedMonth}
						dates={{
							plan,
							pending: datesValid && datesPlan.isPending,
							today: branchToday,
						}}
						departmentExtras={
							setupGate && (
								<ReadinessGateCallout
									gate={setupGate}
									link={fixLink(setupGate)}
								/>
							)
						}
						usesLine={
							<div className="flex flex-col gap-4">
								{usesSummary}
								{!byDates && savedDraftLine && (
									<p className="text-sm text-neutral-800">{savedDraftLine}</p>
								)}
								{!byDates && firstWeekDates}
								{restDaysFrom && unknownRestDays.length > 0 && (
									<Callout tone="warning">
										<span className="block">
											{t("scheduling.startingContext.restDaysAsk", {
												days: restDaysText,
											})}
										</span>
										<span className="block">
											{t("scheduling.startingContext.restDaysFallback", {
												days: restDaysText,
												remaining: formatPeriod(
													{
														start: restDaysFrom,
														end: periodStartingOn(mondayOf(restDaysFrom)).end,
													},
													language
												),
											})}
										</span>
									</Callout>
								)}
								{byDates ? datesStartingPoint : startingPoint}
								{!byDates && laterStartingPoints}
							</div>
						}
						weeks={
							tickable && {
								rows: tickable,
								ticked,
								onTickedChange: setTicks,
							}
						}
						onDatesChange={setDatesChoice}
						onDepartmentChange={chooseDepartment}
						onMonthChange={chooseMonth}
						onSettingsChange={setSettings}
						onSubmit={(values) => {
							setSetup(values);
							// Later steps use exactly the ticks Setup showed.
							setTicks(ticked);
							goTo(1, values);
						}}
					/>
				)}
				{step === "generate" &&
					(!mayGenerate ? (
						<p className="text-sm text-neutral-800">
							{t("scheduling.create.generateForbidden")}
						</p>
					) : (
						<>
							{!byDates &&
								chosenNow.dropped.map((week) => (
									<Callout
										key={week.periodStart}
										className="mb-4"
										tone="warning"
									>
										{t("scheduling.months.generate.droppedNote", {
											week: weekRangeText(
												{ start: week.periodStart, end: week.periodEnd },
												language,
												t
											),
											state: t(badgeOf(week.look).key),
										})}
									</Callout>
								))}
							{!byDates &&
								chosenNow.replacing.map((week) => (
									<Callout
										key={week.periodStart}
										className="mb-4"
										tone="warning"
									>
										{t(
											week.note === "rosterRejected"
												? "scheduling.months.setup.rosterRejectedNote"
												: "scheduling.months.setup.rosterWaitingNote",
											{
												week: weekRangeText(
													{ start: week.periodStart, end: week.periodEnd },
													language,
													t
												),
											}
										)}
									</Callout>
								))}
							{check.isPending && (
								<p className="text-sm text-neutral-800" role="status">
									{t("scheduling.months.generate.panel.checking", {
										month: monthName,
									})}
								</p>
							)}
							{check.isError && (
								<div className="flex flex-col items-start gap-2">
									<ErrorText>
										{t("scheduling.months.generate.panel.checkFailed", {
											month: monthName,
										})}
									</ErrorText>
									<Button
										variant="textlink"
										onClick={() => {
											void check.refetch();
										}}
									>
										{t("scheduling.rosterEdit.tryAgain")}
									</Button>
								</div>
							)}
							{check.data && (
								<BeforeGeneratePanel
									check={check.data}
									month={checkMonth}
									blockedNote={
										!byDates && ticked.length === 0
											? t("scheduling.months.generate.noneLeft")
											: undefined
									}
									generating={
										byDates ? datesGeneration.isPending : generation.isPending
									}
									hint={
										byDates ? datesHint : ticked.length > 0 ? tickedHint : ""
									}
									waiting={
										byDates
											? everything === undefined
											: generation.block === "listsLoading"
									}
									onGenerate={() => {
										void generate();
									}}
								/>
							)}
						</>
					))}
			</div>
			{problem && <ErrorText className="mt-6">{problem}</ErrorText>}
			{step === "generate" ? (
				// The panel holds Generate; the foot only goes back.
				back && (
					<Button
						className="mt-12 min-w-30"
						leadingIcon={<ArrowLeftIcon />}
						variant="secondary"
						onClick={back}
					>
						{t("scheduling.actions.back")}
					</Button>
				)
			) : (
				<StepActions
					className="mt-12"
					form={step === "setup" ? setupFormId : undefined}
					nextDisabled={step === "setup" && setupNextNote !== undefined}
					nextIcon={<ArrowRightIcon />}
					nextLabel={t("scheduling.actions.next")}
					unavailableNote={setupNextNote ?? ""}
					onBack={back}
					onNext={
						step === "setup"
							? undefined
							: (): void => {
									goTo(current + 1);
								}
					}
				/>
			)}
			{choosing && everything && shifts.data && constraints.data && (
				<MonthChoiceDialog
					constraints={constraints.data}
					monthName={monthName}
					shifts={shifts.data}
					constraintTypes={
						constraintOptions.status === "ready"
							? constraintOptions.options.types
							: []
					}
					value={Object.fromEntries(
						weeks.map((week) => [
							week.periodStart,
							choiceOf(week) ?? everything,
						])
					)}
					weeks={weeks.map((week) => ({
						periodStart: week.periodStart,
						label: weekLabel(week),
					}))}
					onApply={(applied) => {
						setChoices(applied);
						setChoosing(false);
					}}
					onClose={() => {
						setChoosing(false);
					}}
				/>
			)}
		</>
	);
};
