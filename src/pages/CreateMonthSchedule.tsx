import { useQuery } from "@tanstack/react-query";
import { Navigate, useNavigate, useSearch } from "@tanstack/react-router";
import dayjs from "dayjs";
import type { TFunction } from "i18next";
import { useCallback, useId, useReducer, useState } from "react";
import { useTranslation } from "react-i18next";
import { formattingLocale } from "@/common/formattingLocale";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { ArrowLeftIcon, ArrowRightIcon } from "@/components/ui/Icon";
import { Stepper, StepperStep } from "@/components/ui/Stepper";
import { constraintsQuery } from "@/features/scheduling/constraints/api";
import { useConstraintOptions } from "@/features/scheduling/constraints/useConstraintOptions";
import { ForecastStep } from "@/features/scheduling/ForecastStep";
import { MonthChoiceDialog } from "@/features/scheduling/MonthChoiceDialog";
import {
	monthGenerationCheckQuery,
	scheduleMonthQuery,
	type MonthWeek,
} from "@/features/scheduling/months/api";
import { BeforeGeneratePanel } from "@/features/scheduling/months/BeforeGeneratePanel";
import {
	MONTH_SETUP_DEFAULTS,
	refusedWeeks,
	startingWeekOf,
	weekNameOf,
	weeksToCreate,
	type MonthChoices,
	type MonthSetup,
} from "@/features/scheduling/months/monthGeneration";
import {
	formatDayAndMonth,
	formatMonth,
	formatMonthName,
	formatWeekDates,
	monthChoicesFrom,
	monthOf,
} from "@/features/scheduling/months/monthWeeks";
import { hasRoster } from "@/features/scheduling/months/weekStateLooks";
import { withRefusedWeeks } from "@/features/scheduling/months/refusedWeeksState";
import { useGenerateMonth } from "@/features/scheduling/months/useGenerateMonth";
import {
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
import {
	emptyScheduleDraft,
	scheduleDraftReducer,
} from "@/features/scheduling/scheduleDraft";
import type { ScheduleShift } from "@/features/scheduling/schedules/api";
import {
	monthGenerationRefusal,
	scheduleRefusalMessage,
} from "@/features/scheduling/schedules/scheduleRefusal";
import {
	useSchedule,
	useScheduleActions,
} from "@/features/scheduling/schedules/useSchedule";
import { SCHEDULING_UNIT_RULES } from "@/features/scheduling/schedules/schedulesUnitRules";
import {
	departmentShiftsQuery,
	type DepartmentShift,
} from "@/features/scheduling/shifts/api";
import { StartingContextSection } from "@/features/scheduling/startingContext/StartingContextSection";
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

/** The Forecast step's rows: the Department's live shifts, each one used. */
const forecastShiftsOf = (
	shifts: Array<DepartmentShift>
): Array<ScheduleShift> =>
	shifts.map((shift) => ({ ...shift, included: true, frozen: false }));

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
 * Create schedules for a month: Setup, Forecast and Generate, as the week
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
	const months = monthChoicesFrom(today);
	const [setup, setSetup] = useState<MonthSetupValues>();
	const setupDefaults: MonthSetupValues = setup ?? {
		departmentId: search.department ?? "",
		month:
			search.month && months.includes(search.month)
				? search.month
				: (months[0] ?? ""),
		...MONTH_SETUP_DEFAULTS,
	};
	// The Department and month the Setup form holds, before it is submitted.
	const [departmentId, setDepartmentId] = useState(setupDefaults.departmentId);
	const [month, setMonth] = useState(setupDefaults.month);
	// Each week's choice, by Monday; a week without one uses everything.
	const [choices, setChoices] = useState<MonthChoices>({});
	const [choosing, setChoosing] = useState(false);
	// The settings the Setup form holds, for the first week when it is saved before the form is.
	const [settings, setSettings] = useState<MonthSetup>({
		includeLeave: setupDefaults.includeLeave,
		allowOpenShifts: setupDefaults.allowOpenShifts,
	});
	// The first week's draft this page just saved, so its grid opens once.
	const [savedStartId, setSavedStartId] = useState<string>();
	const [forecast, dispatch] = useReducer(
		scheduleDraftReducer,
		undefined,
		emptyScheduleDraft
	);
	const [problem, setProblem] = useState("");
	const setupFormId = useId();
	// Another Department or month has other weeks: its choices start again from everything.
	const chooseDepartment = useCallback(
		(next: string): void => {
			if (next === departmentId) return;
			setDepartmentId(next);
			setChoices({});
		},
		[departmentId]
	);
	const chooseMonth = useCallback(
		(next: string): void => {
			if (next === month) return;
			setMonth(next);
			setChoices({});
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
	const shifts = useQuery(departmentShiftsQuery(companyId, unit, readsShifts));
	const constraints = useQuery(
		constraintsQuery(companyId, unit, readsConstraints)
	);
	const constraintOptions = useConstraintOptions(companyId, unit);
	const generation = useGenerateMonth(companyId, scheduleMonth.data);
	const scheduleActions = useScheduleActions(companyId);
	// Where everyone starts is set on the first covered week without a roster.
	const startingWeek = scheduleMonth.data
		? startingWeekOf(scheduleMonth.data)
		: undefined;
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
	const check = useQuery(
		monthGenerationCheckQuery(
			companyId,
			departmentId,
			month,
			mayGenerate && step === "generate"
		)
	);
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
	const weeks: Array<MonthWeek> = scheduleMonth.data
		? weeksToCreate(scheduleMonth.data)
		: [];
	const weekLabel = (week: MonthWeek): string =>
		formatWeekDates({ start: week.periodStart, end: week.periodEnd }, language);
	const choiceOf = (week: MonthWeek): WeekChoiceIds | undefined =>
		choices[week.periodStart] ?? everything;
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
				: !everything || !scheduleMonth.data
					? undefined
					: weeks.length === 0
						? t(`${key}.allSet`, { month: monthName })
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
	const saveStartingWeek = async (monday: string): Promise<void> => {
		if (!unit || !everything) return;
		setProblem("");
		const weekChoice = choices[monday] ?? everything;
		try {
			const created = await scheduleActions.create.mutateAsync({
				unit,
				body: {
					name: weekNameOf(monday),
					periodStart: monday,
					includeLeave: settings.includeLeave,
					allowOpenShifts: settings.allowOpenShifts,
					includedShiftIds: weekChoice.shiftIds,
					includedConstraintIds: weekChoice.constraintIds,
				},
			});
			setSavedStartId(created.scheduleId);
		} catch (error) {
			setProblem(scheduleRefusalMessage(error, true, t));
		}
	};
	const startingPoint =
		!unit || !startingWeek ? undefined : startingWeek.state === "DRAFT" &&
		  startingWeek.scheduleId ? (
			<StartingContextSection
				canEdit={allowedHere("schedule:update")}
				companyId={companyId}
				openOnStart={savedStartId === startingWeek.scheduleId}
				scheduleId={startingWeek.scheduleId}
				unit={unit}
				nonWorkingDayTypes={
					startingDraft.status === "ready"
						? startingDraft.schedule.nonWorkingDayTypes
						: []
				}
			/>
		) : monthBefore.isPending ? undefined : weekBefore && weekBeforeRostered ? (
			<Callout>
				{t("scheduling.startingContext.carried", {
					week: formatDayAndMonth(weekBefore, language),
				})}
			</Callout>
		) : (
			<Callout>
				<span className="flex flex-wrap items-center gap-x-4 gap-y-1">
					<span>{t("scheduling.startingContext.none")}</span>
					{allowedHere("schedule:create") &&
						allowedHere("schedule:update") &&
						everything && (
							<Button
								disabled={scheduleActions.create.isPending}
								variant="textlink"
								onClick={() => {
									void saveStartingWeek(startingWeek.periodStart);
								}}
							>
								{t("scheduling.startingContext.add")}
							</Button>
						)}
				</span>
			</Callout>
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
	// Why Setup's Next waits: the gate, lists the person may not see, or lists still loading (no note).
	const listsWaiting =
		unit !== undefined &&
		!listsHidden &&
		(everything === undefined || scheduleMonth.data === undefined);
	const setupNextNote = setupGate
		? t(setupGate.nextNoteKey, { department: setupGate.department })
		: listsHidden && choice
			? t("scheduling.week.listsHiddenNote", { department: choice.name })
			: listsWaiting
				? ""
				: undefined;
	const generate = async (): Promise<void> => {
		if (!setup) return;
		setProblem("");
		try {
			const answer = await generation.generate({
				choices,
				setup: {
					includeLeave: setup.includeLeave,
					allowOpenShifts: setup.allowOpenShifts,
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
				{t("scheduling.create.title")}
			</h1>
			<p className="mt-3 text-sm text-neutral-800">
				{t("scheduling.create.subtitle")}
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
								{savedDraftLine && (
									<p className="text-sm text-neutral-800">{savedDraftLine}</p>
								)}
								{startingPoint}
							</div>
						}
						onDepartmentChange={chooseDepartment}
						onMonthChange={chooseMonth}
						onSettingsChange={setSettings}
						onSubmit={(values) => {
							setSetup(values);
							goTo(1, values);
						}}
					/>
				)}
				{step === "forecast" && (
					<ForecastStep
						allocations={forecast.allocations}
						demand={forecast.demand}
						mode={forecast.forecastMode}
						periodLabel={formatMonth(month, language)}
						shifts={forecastShiftsOf(shifts.data ?? [])}
						onAllocationChange={(shiftId, jobTitleId, allocated) => {
							dispatch({
								type: "allocationChanged",
								shiftId,
								jobTitleId,
								allocated,
							});
						}}
						onAutoFill={() => {
							dispatch({
								type: "demandAutoFilled",
								shifts: forecastShiftsOf(shifts.data ?? []),
							});
						}}
						onDemandChange={(slotStart, jobTitleId, staff) => {
							dispatch({ type: "demandChanged", slotStart, jobTitleId, staff });
						}}
						onModeChange={(mode) => {
							dispatch({ type: "forecastModeChosen", mode });
						}}
					/>
				)}
				{step === "generate" &&
					(!mayGenerate ? (
						<p className="text-sm text-neutral-800">
							{t("scheduling.create.generateForbidden")}
						</p>
					) : (
						check.data && (
							<BeforeGeneratePanel
								check={check.data}
								generating={generation.isPending}
								month={month}
								waiting={generation.block === "listsLoading"}
								onGenerate={() => {
									void generate();
								}}
							/>
						)
					))}
			</div>
			{problem && (
				<p className="mt-6 text-sm text-error-700" role="alert">
					{problem}
				</p>
			)}
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
