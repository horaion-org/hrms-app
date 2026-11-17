import { useQuery } from "@tanstack/react-query";
import { Navigate, useNavigate, useSearch } from "@tanstack/react-router";
import { useId, useReducer, useState } from "react";
import { useTranslation } from "react-i18next";
import { formattingLocale } from "@/common/formattingLocale";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { ErrorText } from "@/components/ui/ErrorText";
import {
	ArrowLeftIcon,
	ArrowRightIcon,
	GenerateScheduleIcon,
} from "@/components/ui/Icon";
import { Stepper, StepperStep } from "@/components/ui/Stepper";
import { Toast } from "@/components/ui/Toast";
import { placeOf } from "@/features/organisation/assignmentTargets";
import { useConstraintOptions } from "@/features/scheduling/constraints/useConstraintOptions";
import { departmentUnitOf } from "@/features/scheduling/departmentUnit";
import { GenerateStep } from "@/features/scheduling/GenerateStep";
import {
	publishedRosterOtherThan,
	publishedWeekQuery,
} from "@/features/scheduling/publishedWeek/api";
import {
	scheduleMonthQuery,
	type MonthGeneration,
} from "@/features/scheduling/months/api";
import {
	handChangedCoveredWeeks,
	refusedWeeks,
} from "@/features/scheduling/months/monthGeneration";
import {
	formatMonthName,
	monthOf,
} from "@/features/scheduling/months/monthWeeks";
import { weekChangedRefusal } from "@/features/scheduling/months/monthCopy";
import { withRefusedWeeks } from "@/features/scheduling/months/refusedWeeksState";
import { useGenerateMonth } from "@/features/scheduling/months/useGenerateMonth";
import { PublishedWeekCallout } from "@/features/scheduling/publishedWeek/PublishedWeekCallout";
import { RegenerateMonthDialog } from "@/features/scheduling/RegenerateMonthDialog";
import { StartingContextSection } from "@/features/scheduling/startingContext/StartingContextSection";
import {
	defaultPeriod,
	formatPeriod,
	periodStartingOn,
	selectablePeriods,
	withPeriod,
} from "@/features/scheduling/periods";
import {
	emptyScheduleDraft,
	includedShifts,
	isFrozen,
	scheduleDraftReducer,
	summarise,
	tickedConstraintsOf,
	tickedOf,
} from "@/features/scheduling/scheduleDraft";
import {
	draftProblemKey,
	frozenNoticeKey,
} from "@/features/scheduling/schedules/draftNotices";
import { scheduleBodyOf } from "@/features/scheduling/schedules/scheduleBody";
import {
	monthGenerationRefusal,
	scheduleRefusal,
	scheduleRefusalMessage,
} from "@/features/scheduling/schedules/scheduleRefusal";
import {
	useSchedule,
	useScheduleActions,
} from "@/features/scheduling/schedules/useSchedule";
import { useScheduleConstraints } from "@/features/scheduling/schedules/useScheduleConstraints";
import { useScheduleShifts } from "@/features/scheduling/schedules/useScheduleShifts";
import {
	ScheduleSetupStep,
	type SetupFieldErrors,
} from "@/features/scheduling/ScheduleSetupStep";
import type { ScheduleSetupValues } from "@/features/scheduling/setupSchema";
import { gateOf } from "@/features/scheduling/readiness/readinessCopy";
import { ReadinessGateCallout } from "@/features/scheduling/readiness/ReadinessGateCallout";
import { setupLinksOf } from "@/features/scheduling/readiness/setupLinks";
import { useSchedulingReadiness } from "@/features/scheduling/readiness/useSchedulingReadiness";
import { StepActions } from "@/features/scheduling/StepActions";
import { stepCompletion } from "@/features/scheduling/stepCompletion";
import { isScheduleStep, SCHEDULE_STEPS } from "@/features/scheduling/steps";
import {
	allOf,
	usesLineOf,
	usesSummary,
	weekChoiceProblem,
	type WeekChoiceIds,
} from "@/features/scheduling/weekChoice";
import { WeekChoiceDialog } from "@/features/scheduling/WeekChoiceDialog";
import { WeekChoiceSummary } from "@/features/scheduling/WeekChoiceSummary";
import { workspaceQuery } from "@/features/workspace/api";
import {
	SCHEDULE_READ_KEYS,
	type PermissionKey,
} from "@/features/workspace/permissionKeys";
import { retry } from "@/features/workspace/retry";
import { useCurrentCompanyId } from "@/features/workspace/useCurrentCompany";
import { departmentScope } from "@/features/workspace/scopes";
import { useAccess } from "@/features/workspace/useAccess";

/**
 * The Create Schedule steps: Setup and Generate. The URL names the
 * current step and, once Setup is done, the saved draft (`scheduleId` with
 * its `departmentId`, whose routes name it); a later step without a draft
 * sends the person back to Setup. A new draft uses every live shift and
 * constraint of its Department unless the manager chooses otherwise for the
 * week on Setup; completing Setup creates the DRAFT schedule with that
 * choice, and reopening the URL loads it back. The Department's shifts and
 * constraints themselves are changed on the Scheduling tabs. Save Draft
 * sends the setup and the ticks; Generate saves, then freezes the ticked
 * shifts and constraints into the schedule and returns to Scheduling. A
 * generated schedule shows what it was generated with and changes no more.
 * Allocations and demand stay in the page until their API exists.
 */
export const CreateSchedule = (): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const companyId = useCurrentCompanyId();
	const navigate = useNavigate();
	const access = useAccess();
	const workspace = useQuery({ ...workspaceQuery, retry });
	const search = useSearch({ from: "/_authenticated/_app/scheduling_/new" });
	// A step the wizard no longer has (an old Shifts or Constraints link) opens Setup.
	const step = isScheduleStep(search.step) ? search.step : "setup";
	// The two ids name a draft only together.
	const named =
		search.scheduleId !== undefined && search.departmentId !== undefined
			? { scheduleId: search.scheduleId, departmentId: search.departmentId }
			: undefined;
	const [draft, dispatch] = useReducer(
		scheduleDraftReducer,
		undefined,
		emptyScheduleDraft
	);
	// Today is read once, so the offered weeks hold still while the page is open.
	const [today] = useState(() => new Date());
	// The draft the page holds, when it is the one the URL names.
	const saved =
		named !== undefined &&
		draft.saved?.scheduleId === named.scheduleId &&
		draft.saved.departmentId === named.departmentId
			? draft.saved
			: undefined;
	// A reopened draft's branch comes from its department, as the workspace lists it.
	const namedUnit =
		named && workspace.data
			? departmentUnitOf(
					workspace.data,
					companyId,
					SCHEDULE_READ_KEYS,
					named.departmentId
				)
			: undefined;
	const unit = saved ?? namedUnit;
	const schedule = useSchedule(companyId, unit, named?.scheduleId);
	// A draft the URL names but the page doesn't hold yet is taken in while
	// rendering (React's "adjust state on a prop change"), so the steps mount
	// with its values. Only the one the URL names, or it would never settle.
	const answered =
		schedule.status === "ready" &&
		schedule.schedule.scheduleId === named?.scheduleId &&
		schedule.schedule.departmentId === named.departmentId
			? schedule.schedule
			: undefined;
	// Without the department among those the person may read schedules at, the draft can't be reached.
	const draftStatus =
		unit === undefined && workspace.data !== undefined
			? "missing"
			: unit === undefined && workspace.isError
				? "error"
				: schedule.status === "ready" && !answered
					? "missing"
					: schedule.status;
	if (!saved && answered)
		dispatch({ type: "scheduleLoaded", schedule: answered });
	const frozen = saved !== undefined && isFrozen(saved);
	// What may be done at the draft's department; nothing before it is saved.
	const allowed = (key: PermissionKey): boolean =>
		saved !== undefined && access.can(key, departmentScope(saved.departmentId));
	const canSave = !frozen && allowed("schedule:update");
	// A generated schedule, or a draft the person may not change, opens from "View setup" to be looked at.
	const readOnly = saved !== undefined && !canSave;
	// A draft for a week whose roster is already published can never be published, so it isn't generated.
	const publishedWeek = useQuery(
		publishedWeekQuery(
			companyId,
			!frozen && allowed("schedule:read") ? saved : undefined,
			draft.setup?.periodStart
		)
	);
	const weekPublishedBy = publishedRosterOtherThan(
		publishedWeek.data,
		saved?.scheduleId
	);
	const canGenerate =
		!frozen && allowed("schedule:generate") && weekPublishedBy === undefined;
	const shifts = useScheduleShifts(companyId, saved, saved?.scheduleId);
	// The first answer after a load ticks what the schedule includes.
	if (saved && shifts.status === "ready" && !draft.shiftsSeeded)
		dispatch({ type: "shiftsLoaded", shifts: shifts.items });
	const shiftRows = shifts.status === "ready" ? shifts.items : [];
	const ticked = tickedOf(
		draft,
		shifts.status === "ready" ? shifts.items : undefined
	);
	const constraints = useScheduleConstraints(companyId, saved);
	const tickedConstraints = tickedConstraintsOf(
		draft,
		constraints.status === "ready" ? constraints.items : undefined
	);
	// The week chosen on Setup, as the form holds it before it is saved.
	const [setupPeriodStart, setSetupPeriodStart] = useState("");
	// The constraint types, read with the lists, so the week's rules say who they cover.
	const weekOptions = useConstraintOptions(companyId, saved);
	const weekDepartmentName = saved?.departmentName;
	// A saved draft keeps its own lists: live while a draft, frozen copies once generated.
	const weekShifts = shifts.status === "ready" ? shifts.items : undefined;
	const weekConstraints =
		constraints.status === "ready" ? constraints.items : undefined;
	const weekListsHidden =
		shifts.status === "hidden" || constraints.status === "hidden";
	// Everything until the week is chosen; a generated schedule used all of its frozen copies.
	const weekChoice: WeekChoiceIds =
		draft.weekChosen && !frozen
			? { shiftIds: ticked, constraintIds: tickedConstraints }
			: allOf(weekShifts ?? [], weekConstraints ?? []);
	const [choosingWeek, setChoosingWeek] = useState(false);
	// Whether the week's department could roster anyone, as the API answers it.
	const readinessDepartmentId = saved?.departmentId;
	const readiness = useSchedulingReadiness(
		companyId,
		{ departmentId: readinessDepartmentId },
		readinessDepartmentId !== undefined
	);
	const readinessRow =
		readiness.status === "ready"
			? readiness.rows.find((row) => row.departmentId === readinessDepartmentId)
			: undefined;
	const scheduleActions = useScheduleActions(companyId);
	// Generating a draft generates its month: the week belongs to its Monday's month.
	const draftMonth = draft.setup ? monthOf(draft.setup.periodStart) : "";
	const scheduleMonth = useQuery(
		scheduleMonthQuery(
			companyId,
			saved?.departmentId ?? "",
			draftMonth,
			// Only a draft that can be generated: a generated one never reads the live lists.
			canGenerate && draftMonth !== ""
		)
	);
	const monthGeneration = useGenerateMonth(companyId, scheduleMonth.data);
	const [confirmingRegenerate, setConfirmingRegenerate] = useState(false);
	const [toast, setToast] = useState<{ id: number; message: string }>();
	const [problem, setProblem] = useState("");
	const setupFormId = useId();

	const notify = (message: string): void => {
		setToast((previous) => ({ id: (previous?.id ?? 0) + 1, message }));
	};

	const current = SCHEDULE_STEPS.indexOf(step);
	if (current > 0 && named === undefined)
		return <Navigate replace search={{ step: "setup" }} to="/scheduling/new" />;

	const header = (
		<>
			<Button
				leadingIcon={<ArrowLeftIcon />}
				to="/scheduling"
				variant="textlink"
			>
				{t("scheduling.create.back")}
			</Button>
			<h1 className="mt-4 text-4xl font-medium text-neutral-900">
				{readOnly && draft.setup
					? draft.setup.name
					: t("scheduling.create.title")}
			</h1>
			<p className="mt-3 text-sm text-neutral-800">
				{t(
					readOnly
						? "scheduling.create.viewSubtitle"
						: "scheduling.create.subtitle"
				)}
			</p>
		</>
	);
	if (named !== undefined && !saved)
		return (
			<>
				{header}
				<p
					className="mt-12 text-sm text-neutral-700 data-alert:text-error-700"
					data-alert={draftStatus === "error" || undefined}
					role={draftStatus === "error" ? "alert" : undefined}
				>
					{t(draftProblemKey(draftStatus))}
				</p>
			</>
		);

	const goTo = (index: number, draftIds = named): void => {
		setProblem("");
		void navigate({
			to: "/scheduling/new",
			search: {
				step: SCHEDULE_STEPS[index] ?? "setup",
				...draftIds,
			},
		});
	};
	// Completing Setup replaces the saved draft's setup where the person may change it.
	const submitSetup = async (
		setup: ScheduleSetupValues
	): Promise<SetupFieldErrors | undefined> => {
		if (!saved) return undefined;
		setProblem("");
		try {
			if (canSave)
				await scheduleActions.update.mutateAsync({
					unit: saved,
					scheduleId: saved.scheduleId,
					body: scheduleBodyOf(setup, ticked, tickedConstraints),
				});
			dispatch({ type: "setupSaved", setup });
			goTo(1);
			return undefined;
		} catch (error) {
			const refusal = scheduleRefusal(error, false, t);
			setProblem(refusal.message ?? "");
			return refusal.fields;
		}
	};
	// Sends the setup and the ticks; true once the API kept them.
	const save = async (): Promise<boolean> => {
		if (!saved || !draft.setup) return false;
		try {
			await scheduleActions.update.mutateAsync({
				unit: saved,
				scheduleId: saved.scheduleId,
				body: scheduleBodyOf(draft.setup, ticked, tickedConstraints),
			});
			return true;
		} catch (error) {
			setProblem(scheduleRefusalMessage(error, false, t));
			return false;
		}
	};
	const saveDraft = async (): Promise<void> => {
		setProblem("");
		if (await save()) notify(t("scheduling.draft.saved"));
	};
	// Lands on the month page with the weeks the run refused.
	const showMonth = async (answer: MonthGeneration): Promise<void> => {
		await navigate({
			to: "/scheduling/months/$month",
			params: { month: answer.month },
			search: { department: answer.departmentId },
			state: withRefusedWeeks(refusedWeeks(answer)),
		});
	};
	// Saves first when the person may, then generates the draft's month: at once, or after
	// asking when a covered week was changed by hand.
	const generate = async (): Promise<void> => {
		if (!saved || !scheduleMonth.data) return;
		setProblem("");
		if (canSave && !(await save())) return;
		if (handChangedCoveredWeeks(scheduleMonth.data).length > 0) {
			setConfirmingRegenerate(true);
			return;
		}
		// A refusal shows from monthGeneration.error, worded with the month as it is read again.
		await monthGeneration.generate().then(showMonth, () => undefined);
	};
	const included = includedShifts({ includedShiftIds: ticked }, shiftRows);
	const summary = summarise(included, draft.allocations);
	const next = (): void => {
		goTo(current + 1);
	};
	const firstPeriod = defaultPeriod(today);
	const offered = selectablePeriods(today);
	// A saved draft's setup; the empty one only shows for the moment before it is taken in.
	const setupDefaults: ScheduleSetupValues = draft.setup ?? {
		departmentId: "",
		name: "",
		periodStart: firstPeriod.start,
		includeLeave: true,
	};
	const chosenStart = draft.setup?.periodStart;
	// A reopened draft's week may lie outside the offered ones.
	const periods =
		chosenStart === undefined
			? offered
			: withPeriod(offered, chosenStart, today);
	const period = chosenStart ? periodStartingOn(chosenStart) : firstPeriod;
	const isLast = current === SCHEDULE_STEPS.length - 1;
	// Each step is ticked for what the draft holds, not for being behind the current one.
	const completion = stepCompletion({
		saved: saved !== undefined,
		frozen,
	});
	const busy = scheduleActions.update.isPending || monthGeneration.isPending;
	const lockedDepartment = saved && {
		departmentId: saved.departmentId,
		label: placeOf(
			{ branchName: saved.branchName, departmentName: saved.departmentName },
			t
		),
	};
	// The week the Setup form holds, so the dialog and the gate's link name it before it is saved.
	const setupWeek = setupPeriodStart || period.start;
	const weekPeriodLabel = formatPeriod(
		periodStartingOn(setupWeek),
		formattingLocale(i18n)
	);
	// What the week uses, once its department and both lists are known; hidden lists can't be chosen from.
	const weekLine =
		weekDepartmentName === undefined
			? undefined
			: weekListsHidden
				? t("scheduling.week.everything", { department: weekDepartmentName })
				: weekShifts && weekConstraints
					? usesLineOf(
							t,
							usesSummary(weekChoice, weekShifts, weekConstraints),
							weekDepartmentName,
							frozen
						)
					: undefined;
	// The Scheduling tabs that edit the saved draft's department, where its lists may be read.
	const { editShifts, editConstraints, canFix, fixLink } = setupLinksOf(
		saved,
		allowed
	);
	// The week can be chosen from its lists while the setup can change.
	const canChooseWeek =
		!frozen && !weekListsHidden && (saved === undefined || canSave);
	const weekActionLabel =
		frozen && !weekListsHidden
			? t("scheduling.week.view")
			: canChooseWeek
				? t("scheduling.week.choose")
				: undefined;
	const weekSummary = weekLine && (
		<WeekChoiceSummary
			actionLabel={weekActionLabel}
			editConstraints={editConstraints}
			editShifts={editShifts}
			line={weekLine}
			onAction={() => {
				setChoosingWeek(true);
			}}
		/>
	);
	// A saved draft whose department can no longer roster anyone isn't generated.
	const generateGate =
		saved && !frozen && readinessRow
			? gateOf(readinessRow, canFix, "generate")
			: undefined;
	// Nor is a week whose own choice rosters nobody; a generated schedule's copies stay as they were.
	const weekProblem =
		saved && !frozen && weekConstraints
			? weekChoiceProblem(weekChoice, weekConstraints)
			: undefined;
	// A month with no week left to generate (published, over or being generated) has nothing to send.
	const nothingToGenerate = monthGeneration.block === "nothingToGenerate";
	const canGenerateWeek =
		canGenerate &&
		generateGate === undefined &&
		weekProblem === undefined &&
		!nothingToGenerate &&
		scheduleMonth.data !== undefined;
	// Generate says the same, with the week's problem above it, and "Change" goes back to Setup.
	const generateWeekSummary = weekLine && (
		<>
			{weekProblem && (
				<ErrorText className="mb-3">
					{t(
						weekProblem === "noShift"
							? "scheduling.week.noShift"
							: "scheduling.week.noStaffing"
					)}
				</ErrorText>
			)}
			<WeekChoiceSummary
				actionLabel={canChooseWeek ? t("scheduling.week.change") : undefined}
				editConstraints={editConstraints}
				editShifts={editShifts}
				line={weekLine}
				onAction={() => {
					goTo(0);
				}}
			/>
		</>
	);
	// A frozen schedule, or a draft the person may not change, is shown as it is.
	const notice = frozen
		? t(frozenNoticeKey(saved.status))
		: saved && !canSave
			? t("scheduling.draft.readOnly")
			: undefined;
	const onSaveDraft =
		step !== "setup" && canSave
			? (): void => {
					void saveDraft();
				}
			: undefined;
	const onNext = isLast
		? canGenerateWeek
			? (): void => {
					void generate();
				}
			: undefined
		: step === "setup"
			? undefined
			: next;
	const unavailableNote = frozen
		? t("scheduling.create.generated")
		: weekPublishedBy
			? t("scheduling.publishedWeek.generateUnavailable")
			: generateGate
				? t(generateGate.nextNoteKey, { department: generateGate.department })
				: weekProblem
					? t("scheduling.week.problemNote")
					: nothingToGenerate
						? t("scheduling.months.generate.nothingToGenerate", {
								month: formatMonthName(draftMonth, formattingLocale(i18n)),
							})
						: canGenerate
							? // The month is still being read: no note.
								""
							: t("scheduling.create.generateForbidden");

	return (
		<>
			{header}
			{notice && <Callout className="mt-6">{notice}</Callout>}
			<Stepper className="mt-12" currentStep={current} onStepClick={goTo}>
				{SCHEDULE_STEPS.map((name) => (
					<StepperStep
						key={name}
						completed={completion[name]}
						label={t(`scheduling.create.steps.${name}`)}
					/>
				))}
			</Stepper>
			<div className="mt-12">
				{step === "setup" && (
					<ScheduleSetupStep
						companyId={companyId}
						defaultValues={setupDefaults}
						departmentExtras={weekSummary}
						formId={setupFormId}
						lockedDepartment={lockedDepartment}
						periods={periods}
						readOnly={readOnly}
						onPeriodChange={setSetupPeriodStart}
						onSubmit={submitSetup}
					/>
				)}
				{step === "generate" && (
					<GenerateStep
						summary={summary}
						uses={generateWeekSummary}
						notice={
							(generateGate || weekPublishedBy) && (
								<div className="flex flex-col gap-4">
									{saved && generateGate && (
										<ReadinessGateCallout
											gate={generateGate}
											link={fixLink(generateGate, {
												next: "draft",
												scheduleId: saved.scheduleId,
											})}
										/>
									)}
									{weekPublishedBy && (
										<PublishedWeekCallout
											publishedScheduleId={weekPublishedBy}
											stage="blocked"
										/>
									)}
								</div>
							)
						}
						startingPoint={
							saved && (
								<StartingContextSection
									canEdit={canSave}
									companyId={companyId}
									scheduleId={saved.scheduleId}
									unit={saved}
									nonWorkingDayTypes={
										schedule.status === "ready"
											? schedule.schedule.nonWorkingDayTypes
											: []
									}
								/>
							)
						}
					/>
				)}
			</div>
			{problem && <ErrorText className="mt-6">{problem}</ErrorText>}
			{monthGeneration.error && scheduleMonth.data && (
				<ErrorText className="mt-6">
					{monthGenerationRefusal(
						monthGeneration.error,
						t,
						weekChangedRefusal(
							monthGeneration.sentWeeks,
							scheduleMonth.data,
							formattingLocale(i18n),
							t
						)
					)}
				</ErrorText>
			)}
			<StepActions
				busy={busy}
				className="mt-12"
				form={step === "setup" ? setupFormId : undefined}
				nextDisabled={isLast && !canGenerateWeek}
				nextIcon={isLast ? <GenerateScheduleIcon /> : <ArrowRightIcon />}
				unavailableNote={unavailableNote}
				nextLabel={
					isLast
						? t("scheduling.actions.generate")
						: t("scheduling.actions.next")
				}
				onNext={onNext}
				onSaveDraft={onSaveDraft}
				onBack={
					current > 0
						? (): void => {
								goTo(current - 1);
							}
						: undefined
				}
			/>
			{isLast && canGenerateWeek && (
				<p className="mt-3 text-right text-sm text-neutral-700">
					{t("scheduling.months.generate.draftGeneratesMonth", {
						month: formatMonthName(draftMonth, formattingLocale(i18n)),
					})}
				</p>
			)}
			{confirmingRegenerate && scheduleMonth.data && (
				<RegenerateMonthDialog
					companyId={companyId}
					month={scheduleMonth.data}
					onClose={() => {
						setConfirmingRegenerate(false);
					}}
					onStarted={(answer) => {
						void showMonth(answer);
					}}
				/>
			)}
			{choosingWeek && weekShifts && weekConstraints && weekDepartmentName && (
				<WeekChoiceDialog
					constraints={weekConstraints}
					departmentName={weekDepartmentName}
					periodLabel={weekPeriodLabel}
					readOnly={frozen}
					shifts={weekShifts}
					value={weekChoice}
					constraintTypes={
						weekOptions.status === "ready" ? weekOptions.options.types : []
					}
					onApply={(choice) => {
						dispatch({ type: "weekChosen", ...choice });
						setChoosingWeek(false);
					}}
					onClose={() => {
						setChoosingWeek(false);
					}}
				/>
			)}
			{toast && (
				<Toast
					key={toast.id}
					onDismiss={() => {
						setToast(undefined);
					}}
				>
					{toast.message}
				</Toast>
			)}
		</>
	);
};
