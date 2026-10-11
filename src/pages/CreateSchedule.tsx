import { useQuery } from "@tanstack/react-query";
import { Navigate, useNavigate, useSearch } from "@tanstack/react-router";
import { useId, useReducer, useState } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
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
import { useCurrentCompanyId } from "@/features/organisation/useCurrentCompanyId";
import { AddConstraintDialog } from "@/features/scheduling/AddConstraintDialog";
import { ConstraintsStep } from "@/features/scheduling/ConstraintsStep";
import { departmentUnitOf } from "@/features/scheduling/departmentUnit";
import { ForecastStep } from "@/features/scheduling/ForecastStep";
import { GenerateStep } from "@/features/scheduling/GenerateStep";
import {
	formatPeriod,
	periodStartingOn,
	upcomingPeriods,
} from "@/features/scheduling/periods";
import {
	emptyScheduleDraft,
	includedShifts,
	isFrozen,
	rolesOf,
	scheduleDraftReducer,
	summarise,
	tickedOf,
	type Constraint,
	type ConstraintRule,
	type ScheduleSetup,
	type Shift,
} from "@/features/scheduling/scheduleDraft";
import type { ScheduleBody } from "@/features/scheduling/schedules/api";
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
import {
	useScheduleShifts,
	type ShiftList,
} from "@/features/scheduling/schedules/useScheduleShifts";
import {
	ScheduleSetupStep,
	type SetupFieldErrors,
} from "@/features/scheduling/ScheduleSetupStep";
import { withSchedulingNotice } from "@/features/scheduling/schedulingNotice";
import type { ScheduleSetupValues } from "@/features/scheduling/setupSchema";
import { groupsOf } from "@/features/scheduling/shifts/api";
import { ShiftDialog } from "@/features/scheduling/shifts/ShiftDialog";
import { deleteShiftRefusal } from "@/features/scheduling/shifts/shiftRefusal";
import {
	ShiftsStep,
	type ListProblem,
} from "@/features/scheduling/shifts/ShiftsStep";
import { useShiftActions } from "@/features/scheduling/shifts/useShiftActions";
import { useShiftRoleOptions } from "@/features/scheduling/shifts/useShiftRoleOptions";
import { StepActions } from "@/features/scheduling/StepActions";
import { SCHEDULE_STEPS } from "@/features/scheduling/steps";
import { workspaceQuery } from "@/features/workspace/api";
import type { PermissionKey } from "@/features/workspace/permissionKeys";
import { retry } from "@/features/workspace/retry";
import { departmentScope } from "@/features/workspace/scopes";
import { useAccess } from "@/features/workspace/useAccess";

/** A new draft goes to a Department where schedules may be created. */
const CREATE_KEYS: ReadonlyArray<PermissionKey> = ["schedule:create"];

/** A draft the URL names is reached through a Department where schedules may be read. */
const READ_KEYS: ReadonlyArray<PermissionKey> = ["schedule:read"];

/** What saving a schedule sends: its setup and the ticked shifts, the whole set. */
const bodyOf = (
	setup: ScheduleSetup,
	includedShiftIds: Array<string>
): ScheduleBody => ({
	name: setup.name,
	periodStart: setup.periodStart,
	includeLeave: setup.includeLeave,
	allowOpenShifts: setup.allowOpenShifts,
	includedShiftIds,
});

/** Why the shifts are not listed. */
const shiftListProblem = (
	status: ShiftList["status"],
	t: TFunction
): ListProblem | undefined => {
	if (status === "hidden")
		return { message: t("scheduling.shifts.hidden"), alert: false };
	if (status === "error")
		return { message: t("scheduling.shifts.failed"), alert: true };
	if (status === "pending")
		return { message: t("scheduling.shifts.loading"), alert: false };
	return undefined;
};

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

/**
 * The Create Schedule steps: Setup, Shifts, Constraints, Forecast and
 * Generate. The URL names the current step and, once Setup is done, the
 * saved draft (`scheduleId` with its `departmentId`, whose routes name it);
 * a later step without a draft sends the person back to Setup. Completing
 * Setup creates the DRAFT schedule; reopening the URL loads it back. Its
 * shifts are the Department's live shifts, ticked as the schedule keeps
 * them, and changed under their own keys for every draft of the
 * Department. Save Draft sends the setup and the ticks; Generate saves,
 * then freezes the ticked shifts into the schedule and returns to
 * Scheduling. A generated schedule shows its frozen shifts and changes no
 * more. Constraints, allocations and demand stay in the page until their
 * API exists.
 */
export const CreateSchedule = (): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const companyId = useCurrentCompanyId();
	const navigate = useNavigate();
	const access = useAccess();
	const workspace = useQuery({ ...workspaceQuery, retry });
	const search = useSearch({ from: "/_authenticated/_app/scheduling_/new" });
	const step = search.step ?? "setup";
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
	const [upcoming] = useState(() => upcomingPeriods(new Date()));
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
					READ_KEYS,
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
	const canGenerate = !frozen && allowed("schedule:generate");
	const canAddShift = !frozen && allowed("shift:create");
	const canEditShift = !frozen && allowed("shift:update");
	const canDeleteShift = !frozen && allowed("shift:delete");
	const shifts = useScheduleShifts(companyId, saved, saved?.scheduleId);
	// The first answer after a load ticks what the schedule includes.
	if (saved && shifts.status === "ready" && !draft.shiftsSeeded)
		dispatch({ type: "shiftsLoaded", shifts: shifts.items });
	const shiftRows = shifts.status === "ready" ? shifts.items : [];
	const ticked = tickedOf(
		draft,
		shifts.status === "ready" ? shifts.items : undefined
	);
	const [dialog, setDialog] = useState<{ editing?: Shift } | null>(null);
	const roles = useShiftRoleOptions(companyId, saved, dialog !== null);
	const scheduleActions = useScheduleActions(companyId);
	const shiftActions = useShiftActions(companyId);
	const [toast, setToast] = useState<{ id: number; message: string }>();
	const [problem, setProblem] = useState("");
	const [addingConstraint, setAddingConstraint] = useState(false);
	// Set when Next is refused, so the reason shows only after a try.
	const [blocked, setBlocked] = useState(false);
	const setupFormId = useId();

	const notify = (message: string): void => {
		setToast((previous) => ({ id: (previous?.id ?? 0) + 1, message }));
	};
	const deleteShift = (shift: Shift): void => {
		if (!saved) return;
		setProblem("");
		shiftActions.deleteShift.mutate(
			{ unit: saved, shiftId: shift.shiftId },
			{
				onSuccess: () => {
					dispatch({ type: "shiftRemoved", shiftId: shift.shiftId });
					notify(t("scheduling.shifts.deleted"));
				},
				onError: (error) => {
					setProblem(deleteShiftRefusal(error, t));
				},
			}
		);
	};
	const deleteConstraint = (constraint: Constraint): void => {
		dispatch({
			type: "constraintDeleted",
			constraintId: constraint.constraintId,
		});
		notify(t("scheduling.constraints.deleted"));
	};
	const changeAllocation = (
		shiftId: string,
		jobTitleId: string,
		allocated: number
	): void => {
		dispatch({ type: "allocationChanged", shiftId, jobTitleId, allocated });
	};
	const openShiftDialog = (editing?: Shift): void => {
		setDialog({ editing });
	};
	const addConstraint = (rule: ConstraintRule, details: string): void => {
		dispatch({
			type: "constraintAdded",
			constraint: {
				constraintId: crypto.randomUUID(),
				name: t(`scheduling.constraints.types.${rule.type}`),
				type: rule.type,
				details,
				priority: "MEDIUM",
				status: "ACTIVE",
				rule,
			},
		});
		setAddingConstraint(false);
		notify(t("scheduling.constraints.added"));
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
				{t("scheduling.create.title")}
			</h1>
			<p className="mt-3 text-sm text-neutral-800">
				{t("scheduling.create.subtitle")}
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
		setBlocked(false);
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
						body: bodyOf(setup, ticked),
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
					CREATE_KEYS,
					setup.departmentId,
					{ activeOnly: true }
				);
			if (!target) return undefined;
			const created = await scheduleActions.create.mutateAsync({
				unit: target,
				body: bodyOf(setup, []),
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
				body: bodyOf(draft.setup, ticked),
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
	// Saves first when the person may, then freezes the ticked shifts and leaves.
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
	const stepProblem =
		step === "shifts" && !frozen && ticked.length === 0
			? t("scheduling.shifts.required")
			: undefined;
	const shownProblem = blocked ? stepProblem : undefined;
	const next = (): void => {
		if (stepProblem) setBlocked(true);
		else goTo(current + 1);
	};
	const firstPeriod = upcoming[0];
	const setupDefaults: ScheduleSetupValues = draft.setup ?? {
		departmentId: "",
		name: "",
		periodStart: firstPeriod?.start ?? "",
		includeLeave: true,
		allowOpenShifts: false,
	};
	const chosenStart = draft.setup?.periodStart;
	// A reopened draft's week may have passed out of the upcoming ones.
	const periods =
		chosenStart === undefined ||
		upcoming.some((period) => period.start === chosenStart)
			? upcoming
			: [periodStartingOn(chosenStart), ...upcoming];
	const period = chosenStart ? periodStartingOn(chosenStart) : firstPeriod;
	const periodLabel = period
		? formatPeriod(period, i18n.resolvedLanguage ?? i18n.language)
		: "";
	const isLast = current === SCHEDULE_STEPS.length - 1;
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
	// A frozen schedule, or a draft the person may not change, is shown as it is.
	const notice = frozen
		? t("scheduling.draft.generated")
		: saved && !canSave
			? t("scheduling.draft.readOnly")
			: undefined;
	const onAddShift = canAddShift
		? (): void => {
				openShiftDialog();
			}
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
			: "scheduling.create.generateForbidden"
	);
	const onIncludedChange = frozen
		? undefined
		: (shiftIds: Array<string>): void => {
				dispatch({ type: "shiftsIncluded", shiftIds });
			};

	return (
		<>
			{header}
			{notice && <Callout className="mt-6">{notice}</Callout>}
			<Stepper className="mt-12" currentStep={current} onStepClick={goTo}>
				{SCHEDULE_STEPS.map((name) => (
					<StepperStep
						key={name}
						label={t(`scheduling.create.steps.${name}`)}
					/>
				))}
			</Stepper>
			<div className="mt-12">
				{step === "setup" && (
					<ScheduleSetupStep
						companyId={companyId}
						defaultValues={setupDefaults}
						formId={setupFormId}
						lockedDepartment={lockedDepartment}
						periods={periods}
						readOnly={saved !== undefined && !canSave}
						onSubmit={submitSetup}
					/>
				)}
				{step === "shifts" && (
					<ShiftsStep
						frozen={frozen}
						includedShiftIds={ticked}
						listProblem={shiftListProblem(shifts.status, t)}
						problem={shownProblem}
						shifts={shiftRows}
						onAdd={onAddShift}
						onDelete={canDeleteShift ? deleteShift : undefined}
						onEdit={canEditShift ? openShiftDialog : undefined}
						onIncludedChange={onIncludedChange}
					/>
				)}
				{step === "constraints" && (
					<ConstraintsStep
						constraints={draft.constraints}
						includedConstraintIds={draft.includedConstraintIds}
						onDelete={deleteConstraint}
						onAdd={() => {
							setAddingConstraint(true);
						}}
						onIncludedChange={(constraintIds) => {
							dispatch({ type: "constraintsIncluded", constraintIds });
						}}
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
				{step === "generate" && <GenerateStep summary={summary} />}
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
			{dialog && saved && (
				<ShiftDialog
					editing={dialog.editing}
					groups={groupsOf(shiftRows)}
					roles={roles}
					onClose={() => {
						setDialog(null);
					}}
					onSave={async (body) => {
						const editing = dialog.editing;
						const shift = editing
							? await shiftActions.updateShift.mutateAsync({
									unit: saved,
									shiftId: editing.shiftId,
									body,
								})
							: await shiftActions.createShift.mutateAsync({
									unit: saved,
									body,
								});
						// A shift added here is ticked for this draft until it is saved or unticked.
						if (!editing)
							dispatch({
								type: "shiftsIncluded",
								shiftIds: [...draft.includedShiftIds, shift.shiftId],
							});
						notify(
							t(
								editing ? "scheduling.shifts.edited" : "scheduling.shifts.added"
							)
						);
					}}
				/>
			)}
			{step === "constraints" && addingConstraint && (
				<AddConstraintDialog
					roles={rolesOf(shiftRows)}
					shifts={shiftRows}
					onSubmit={addConstraint}
					onClose={() => {
						setAddingConstraint(false);
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
