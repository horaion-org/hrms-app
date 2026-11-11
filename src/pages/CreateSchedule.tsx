import { useQuery } from "@tanstack/react-query";
import { Navigate, useNavigate, useSearch } from "@tanstack/react-router";
import { useCallback, useId, useReducer, useState } from "react";
import { useTranslation } from "react-i18next";
import { formattingLocale } from "@/common/formattingLocale";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import {
	ArrowLeftIcon,
	ArrowRightIcon,
	GenerateScheduleIcon,
} from "@/components/ui/Icon";
import { Stepper, StepperStep } from "@/components/ui/Stepper";
import { Toast } from "@/components/ui/Toast";
import { placeOf } from "@/features/organisation/assignmentTargets";
import { constraintsQuery } from "@/features/scheduling/constraints/api";
import { departmentUnitOf } from "@/features/scheduling/departmentUnit";
import { ForecastStep } from "@/features/scheduling/ForecastStep";
import { GenerateStep } from "@/features/scheduling/GenerateStep";
import {
	publishedRosterOtherThan,
	publishedWeekQuery,
} from "@/features/scheduling/publishedWeek/api";
import { PublishedWeekCallout } from "@/features/scheduling/publishedWeek/PublishedWeekCallout";
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
	type ScheduleSetup,
} from "@/features/scheduling/scheduleDraft";
import type {
	ScheduleBody,
	ScheduleStatus,
} from "@/features/scheduling/schedules/api";
import {
	generationRefusal,
	scheduleRefusal,
	scheduleRefusalMessage,
} from "@/features/scheduling/schedules/scheduleRefusal";
import {
	useSchedule,
	useScheduleActions,
	type ScheduleState,
} from "@/features/scheduling/schedules/useSchedule";
import { useScheduleConstraints } from "@/features/scheduling/schedules/useScheduleConstraints";
import { useScheduleShifts } from "@/features/scheduling/schedules/useScheduleShifts";
import {
	ScheduleSetupStep,
	type SetupFieldErrors,
} from "@/features/scheduling/ScheduleSetupStep";
import { withSchedulingNotice } from "@/features/scheduling/schedulingNotice";
import type { ScheduleSetupValues } from "@/features/scheduling/setupSchema";
import { departmentShiftsQuery } from "@/features/scheduling/shifts/api";
import { StepActions } from "@/features/scheduling/StepActions";
import { stepCompletion } from "@/features/scheduling/stepCompletion";
import { isScheduleStep, SCHEDULE_STEPS } from "@/features/scheduling/steps";
import {
	allOf,
	usesLineOf,
	usesSummary,
	type WeekChoiceIds,
} from "@/features/scheduling/weekChoice";
import { WeekChoiceDialog } from "@/features/scheduling/WeekChoiceDialog";
import {
	WeekChoiceSummary,
	type SetupLink,
} from "@/features/scheduling/WeekChoiceSummary";
import { workspaceQuery } from "@/features/workspace/api";
import {
	SCHEDULE_CREATE_KEYS,
	SCHEDULE_READ_KEYS,
	type PermissionKey,
} from "@/features/workspace/permissionKeys";
import { retry } from "@/features/workspace/retry";
import { SCHEDULING_UNIT_RULES } from "@/features/scheduling/schedules/schedulesUnitRules";
import { useCurrentCompanyId } from "@/features/workspace/useCurrentCompany";
import { useUnitSelection } from "@/features/workspace/useUnitSelection";
import { departmentScope } from "@/features/workspace/scopes";
import { useAccess } from "@/features/workspace/useAccess";
import { departmentChoices } from "@/features/workspace/unitChoices";

/** What saving a schedule sends: its setup and the ticked shifts and constraints, each the whole set. */
const bodyOf = (
	setup: ScheduleSetup,
	includedShiftIds: Array<string>,
	includedConstraintIds: Array<string>
): ScheduleBody => ({
	name: setup.name,
	periodStart: setup.periodStart,
	includeLeave: setup.includeLeave,
	allowOpenShifts: setup.allowOpenShifts,
	includedShiftIds,
	includedConstraintIds,
});

/** The copy a draft that can't be shown is explained with. */
const draftProblemKey = (
	status: ScheduleState["status"]
):
	| "scheduling.draft.loading"
	| "scheduling.draft.missing"
	| "scheduling.draft.failed" => {
	if (status === "error") return "scheduling.draft.failed";
	if (status === "hidden" || status === "missing")
		return "scheduling.draft.missing";
	return "scheduling.draft.loading";
};

/** What a frozen schedule's notice says: generation requested, failed, or done (also once decided). */
const frozenNoticeKey = (
	status: ScheduleStatus
):
	| "scheduling.draft.generationRequested"
	| "scheduling.draft.generated"
	| "scheduling.draft.generationFailed" => {
	if (status === "GENERATION_REQUESTED")
		return "scheduling.draft.generationRequested";
	if (status === "GENERATION_FAILED")
		return "scheduling.draft.generationFailed";
	return "scheduling.draft.generated";
};

/**
 * The Create Schedule steps: Setup, Forecast and Generate. The URL names the
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
	// The header's Branch, resolved as the header resolves it: a new draft's departments are its own.
	const headerBranchId = useUnitSelection(
		companyId,
		SCHEDULE_CREATE_KEYS,
		{ branchId: search.branch },
		SCHEDULING_UNIT_RULES
	).branch?.branchId;
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
	// The department and week chosen on Setup, as the form holds them before they are saved.
	const [setupDepartmentId, setSetupDepartmentId] = useState("");
	const [setupPeriodStart, setSetupPeriodStart] = useState("");
	// A new draft's week starts again from everything when its department changes.
	const chooseSetupDepartment = useCallback(
		(departmentId: string): void => {
			if (departmentId === setupDepartmentId) return;
			setSetupDepartmentId(departmentId);
			if (!saved) dispatch({ type: "departmentChosen" });
		},
		[setupDepartmentId, saved, dispatch]
	);
	// A new draft's department, where schedules may be created; a saved draft names its own.
	const setupChoice =
		!saved && workspace.data && setupDepartmentId
			? departmentChoices(workspace.data, companyId, SCHEDULE_CREATE_KEYS, {
					activeOnly: true,
				}).find((choice) => choice.departmentId === setupDepartmentId)
			: undefined;
	const setupUnit = setupChoice && {
		branchId: setupChoice.branchId,
		departmentId: setupChoice.departmentId,
	};
	const readsNewShifts =
		setupUnit !== undefined &&
		access.can("shift:read", departmentScope(setupUnit.departmentId));
	const readsNewConstraints =
		setupUnit !== undefined &&
		access.can("constraint:read", departmentScope(setupUnit.departmentId));
	// A new draft lists its department's live shifts and constraints; a saved one keeps its own lists.
	const newShifts = useQuery(
		departmentShiftsQuery(companyId, setupUnit, readsNewShifts)
	);
	const newConstraints = useQuery(
		constraintsQuery(companyId, setupUnit, readsNewConstraints)
	);
	const weekDepartmentName = saved?.departmentName ?? setupChoice?.name;
	const weekShifts = saved
		? shifts.status === "ready"
			? shifts.items
			: undefined
		: newShifts.data;
	const weekConstraints = saved
		? constraints.status === "ready"
			? constraints.items
			: undefined
		: newConstraints.data;
	const weekListsHidden = saved
		? shifts.status === "hidden" || constraints.status === "hidden"
		: setupUnit !== undefined && (!readsNewShifts || !readsNewConstraints);
	// Everything until the week is chosen; a generated schedule used all of its frozen copies.
	const weekChoice: WeekChoiceIds =
		draft.weekChosen && !frozen
			? { shiftIds: ticked, constraintIds: tickedConstraints }
			: allOf(weekShifts ?? [], weekConstraints ?? []);
	const [choosingWeek, setChoosingWeek] = useState(false);
	const scheduleActions = useScheduleActions(companyId);
	const [toast, setToast] = useState<{ id: number; message: string }>();
	const [problem, setProblem] = useState("");
	const setupFormId = useId();

	const notify = (message: string): void => {
		setToast((previous) => ({ id: (previous?.id ?? 0) + 1, message }));
	};
	const changeAllocation = (
		shiftId: string,
		jobTitleId: string,
		allocated: number
	): void => {
		dispatch({ type: "allocationChanged", shiftId, jobTitleId, allocated });
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
	// Completing Setup creates the draft, or replaces the saved one's setup.
	const submitSetup = async (
		setup: ScheduleSetupValues
	): Promise<SetupFieldErrors | undefined> => {
		setProblem("");
		try {
			if (saved) {
				if (canSave)
					await scheduleActions.update.mutateAsync({
						unit: saved,
						scheduleId: saved.scheduleId,
						body: bodyOf(setup, ticked, tickedConstraints),
					});
				dispatch({ type: "setupSaved", setup });
				goTo(1);
				return undefined;
			}
			const target =
				workspace.data &&
				departmentUnitOf(
					workspace.data,
					companyId,
					SCHEDULE_CREATE_KEYS,
					setup.departmentId,
					{ activeOnly: true }
				);
			if (!target) return undefined;
			const created = await scheduleActions.create.mutateAsync({
				unit: target,
				body: bodyOf(setup, weekChoice.shiftIds, weekChoice.constraintIds),
			});
			dispatch({ type: "scheduleLoaded", schedule: created });
			goTo(1, {
				scheduleId: created.scheduleId,
				departmentId: created.departmentId,
			});
			return undefined;
		} catch (error) {
			const refusal = scheduleRefusal(error, !saved, t);
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
				body: bodyOf(draft.setup, ticked, tickedConstraints),
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
	// Saves first when the person may, then freezes the ticked shifts and constraints and leaves.
	const generate = async (): Promise<void> => {
		if (!saved || !draft.setup) return;
		setProblem("");
		if (canSave && !(await save())) return;
		try {
			await scheduleActions.generate.mutateAsync({
				unit: saved,
				scheduleId: saved.scheduleId,
			});
		} catch (error) {
			setProblem(generationRefusal(error, t));
			return;
		}
		await navigate({
			to: "/scheduling",
			state: withSchedulingNotice({
				kind: "generated",
				name: draft.setup.name,
			}),
		});
	};
	const included = includedShifts({ includedShiftIds: ticked }, shiftRows);
	const summary = summarise(included, draft.allocations);
	const next = (): void => {
		goTo(current + 1);
	};
	const firstPeriod = defaultPeriod(today);
	const setupDefaults: ScheduleSetupValues = draft.setup ?? {
		departmentId: "",
		name: "",
		periodStart: firstPeriod.start,
		includeLeave: true,
		allowOpenShifts: false,
	};
	const chosenStart = draft.setup?.periodStart;
	// A reopened draft's week may lie outside the offered ones.
	const offered = selectablePeriods(today);
	const periods =
		chosenStart === undefined
			? offered
			: withPeriod(offered, chosenStart, today);
	const period = chosenStart ? periodStartingOn(chosenStart) : firstPeriod;
	const periodLabel = formatPeriod(period, formattingLocale(i18n));
	const isLast = current === SCHEDULE_STEPS.length - 1;
	// Each step is ticked for what the draft holds, not for being behind the current one.
	const completion = stepCompletion({
		saved: saved !== undefined,
		frozen,
		currentIndex: current,
	});
	const busy =
		scheduleActions.create.isPending ||
		scheduleActions.update.isPending ||
		scheduleActions.generate.isPending;
	const lockedDepartment = saved && {
		departmentId: saved.departmentId,
		label: placeOf(
			{ branchName: saved.branchName, departmentName: saved.departmentName },
			t
		),
	};
	// The week the Setup form holds, so the dialog names it before it is saved.
	const weekPeriodLabel = formatPeriod(
		periodStartingOn(setupPeriodStart || period.start),
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
	// The Scheduling tab that edits the week's department, where its list may be read.
	const weekUnit = saved ?? setupUnit;
	const editLink = (
		view: SetupLink["search"]["view"],
		readKey: PermissionKey
	): SetupLink | undefined =>
		weekUnit && access.can(readKey, departmentScope(weekUnit.departmentId))
			? {
					to: "/scheduling",
					search: {
						view,
						branch: weekUnit.branchId,
						department: weekUnit.departmentId,
					},
				}
			: undefined;
	const editShifts = editLink("shifts", "shift:read");
	const editConstraints = editLink("constraints", "constraint:read");
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
	// Generate says the same, and "Change" goes back to Setup, where the week is chosen.
	const generateWeekSummary = weekLine && (
		<WeekChoiceSummary
			actionLabel={canChooseWeek ? t("scheduling.week.change") : undefined}
			editConstraints={editConstraints}
			editShifts={editShifts}
			line={weekLine}
			onAction={() => {
				goTo(0);
			}}
		/>
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
		? canGenerate
			? (): void => {
					void generate();
				}
			: undefined
		: step === "setup"
			? undefined
			: next;
	const unavailableNote = t(
		frozen
			? "scheduling.create.generated"
			: weekPublishedBy
				? "scheduling.publishedWeek.generateUnavailable"
				: "scheduling.create.generateForbidden"
	);

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
						branchId={headerBranchId}
						companyId={companyId}
						defaultValues={setupDefaults}
						departmentExtras={weekSummary}
						formId={setupFormId}
						lockedDepartment={lockedDepartment}
						periods={periods}
						readOnly={readOnly}
						onDepartmentChange={chooseSetupDepartment}
						onPeriodChange={setSetupPeriodStart}
						onSubmit={submitSetup}
					/>
				)}
				{step === "forecast" && (
					<ForecastStep
						allocations={draft.allocations}
						demand={draft.demand}
						mode={draft.forecastMode}
						periodLabel={periodLabel}
						shifts={included}
						onAllocationChange={changeAllocation}
						onAutoFill={() => {
							dispatch({ type: "demandAutoFilled", shifts: included });
						}}
						onDemandChange={(slotStart, jobTitleId, staff) => {
							dispatch({ type: "demandChanged", slotStart, jobTitleId, staff });
						}}
						onModeChange={(mode) => {
							dispatch({ type: "forecastModeChosen", mode });
						}}
					/>
				)}
				{step === "generate" && (
					<GenerateStep
						summary={summary}
						uses={generateWeekSummary}
						notice={
							weekPublishedBy && (
								<PublishedWeekCallout
									publishedScheduleId={weekPublishedBy}
									stage="blocked"
								/>
							)
						}
						startingPoint={
							saved && (
								<StartingContextSection
									canEdit={canSave}
									companyId={companyId}
									scheduleId={saved.scheduleId}
									unit={saved}
								/>
							)
						}
					/>
				)}
			</div>
			{problem && (
				<p className="mt-6 text-sm text-error-700" role="alert">
					{problem}
				</p>
			)}
			<StepActions
				busy={busy}
				className="mt-12"
				form={step === "setup" ? setupFormId : undefined}
				nextDisabled={isLast && !canGenerate}
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
			{choosingWeek && weekShifts && weekConstraints && weekDepartmentName && (
				<WeekChoiceDialog
					constraints={weekConstraints}
					departmentName={weekDepartmentName}
					periodLabel={weekPeriodLabel}
					readOnly={frozen}
					shifts={weekShifts}
					value={weekChoice}
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
