import { Navigate, useNavigate, useSearch } from "@tanstack/react-router";
import { useCallback, useId, useReducer, useState } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import {
	ArrowLeftIcon,
	ArrowRightIcon,
	GenerateScheduleIcon,
} from "@/components/ui/Icon";
import { Stepper, StepperStep } from "@/components/ui/Stepper";
import { Toast } from "@/components/ui/Toast";
import type { ListQuery } from "@/features/organisation/api";
import { useCurrentCompanyId } from "@/features/organisation/useCurrentCompanyId";
import {
	useDepartments,
	useJobTitles,
} from "@/features/organisation/useOrganisationList";
import { ConstraintsStep } from "@/features/scheduling/ConstraintsStep";
import { ForecastStep } from "@/features/scheduling/ForecastStep";
import { GenerateStep } from "@/features/scheduling/GenerateStep";
import {
	formatPeriod,
	periodStartingOn,
	upcomingPeriods,
} from "@/features/scheduling/periods";
import {
	emptyScheduleDraft,
	includedIdsOf,
	includedShifts,
	scheduleDraftReducer,
	summarise,
	type Constraint,
	type ScheduleSetup,
	type Shift,
} from "@/features/scheduling/scheduleDraft";
import type { ScheduleBody } from "@/features/scheduling/schedules/api";
import {
	scheduleRefusal,
	scheduleRefusalMessage,
} from "@/features/scheduling/schedules/scheduleRefusal";
import {
	useSchedule,
	useScheduleActions,
	type ScheduleState,
} from "@/features/scheduling/schedules/useSchedule";
import {
	ScheduleSetupStep,
	type SetupFieldErrors,
} from "@/features/scheduling/ScheduleSetupStep";
import type { ScheduleSetupValues } from "@/features/scheduling/setupSchema";
import { groupsOf } from "@/features/scheduling/shifts/api";
import { ShiftDialog } from "@/features/scheduling/shifts/ShiftDialog";
import {
	deleteShiftRefusal,
	inclusionRefusal,
} from "@/features/scheduling/shifts/shiftRefusal";
import {
	ShiftsStep,
	type ListProblem,
} from "@/features/scheduling/shifts/ShiftsStep";
import { useShiftActions } from "@/features/scheduling/shifts/useShiftActions";
import {
	useShifts,
	type ShiftList,
} from "@/features/scheduling/shifts/useShifts";
import { StepActions } from "@/features/scheduling/StepActions";
import { SCHEDULE_STEPS } from "@/features/scheduling/steps";
import { useCan } from "@/features/workspace/useCan";

const DEPARTMENTS: ListQuery = {
	sort: { field: "name", desc: false },
	status: "ACTIVE",
};

const JOB_TITLES: ListQuery = {
	sort: { field: "name", desc: false },
	status: "ACTIVE",
};

/** What saving a schedule sends: its setup. */
const bodyOf = (setup: ScheduleSetup): ScheduleBody => ({
	name: setup.name,
	periodStart: setup.periodStart,
	includeLeave: setup.includeLeave,
	allowOpenShifts: setup.allowOpenShifts,
});

/** Why the shifts are not listed; `readable` false when `shift:read` isn't held at the department. */
const shiftListProblem = (
	status: ShiftList["status"],
	readable: boolean,
	t: TFunction
): ListProblem | undefined => {
	if (!readable || status === "hidden")
		return { message: t("scheduling.shifts.hidden"), alert: false };
	if (status === "error")
		return { message: t("scheduling.shifts.failed"), alert: true };
	if (status === "pending")
		return { message: t("scheduling.shifts.loading"), alert: false };
	return undefined;
};

/** Whether two id lists hold the same ids, in any order. */
const sameIds = (first: Array<string>, second: Array<string>): boolean =>
	first.length === second.length &&
	first.every((shiftId) => second.includes(shiftId));

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
 * a later step without a draft sends the person
 * back to Setup. Completing Setup creates the DRAFT schedule, whose shifts
 * are its own and read on their own; reopening the URL loads it back. The
 * page ticks the shifts the API keeps as included once they load and keeps
 * the ticks until Save Draft sends them, and keeps the constraints,
 * allocations and demand, which have no API yet.
 */
export const CreateSchedule = (): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const companyId = useCurrentCompanyId();
	const navigate = useNavigate();
	const can = useCan();
	const search = useSearch({ from: "/_authenticated/_app/scheduling_/new" });
	const step = search.step ?? "setup";
	// The two ids name a draft only together.
	const named =
		search.scheduleId !== undefined && search.departmentId !== undefined
			? { scheduleId: search.scheduleId, departmentId: search.departmentId }
			: undefined;
	const scheduleId = named?.scheduleId;
	const [draft, dispatch] = useReducer(
		scheduleDraftReducer,
		undefined,
		emptyScheduleDraft
	);
	const [upcoming] = useState(() => upcomingPeriods(new Date()));
	const departments = useDepartments(companyId, DEPARTMENTS);
	// The draft the page holds, when it is the one the URL names.
	const saved =
		named !== undefined &&
		draft.saved?.scheduleId === named.scheduleId &&
		draft.saved.departmentId === named.departmentId
			? draft.saved
			: undefined;
	// A reopened draft's branch comes from its department.
	const namedDepartment =
		named && departments.status === "ready"
			? departments.items.find(
					(item) => item.departmentId === named.departmentId
				)
			: undefined;
	const unit =
		saved ??
		(namedDepartment && {
			branchId: namedDepartment.branchId,
			departmentId: namedDepartment.departmentId,
		});
	const schedule = useSchedule(companyId, unit, scheduleId);
	// Without the department among those the person can see, the draft can't be reached.
	const draftStatus =
		unit === undefined && departments.status !== "pending"
			? departments.status === "error"
				? "error"
				: "missing"
			: schedule.status;
	// A draft the URL names but the page doesn't hold yet is taken in while
	// rendering (React's "adjust state on a prop change"), so the steps mount
	// with its values.
	if (scheduleId !== undefined && !saved && schedule.status === "ready")
		dispatch({ type: "scheduleLoaded", schedule: schedule.schedule });
	// What may be done at the draft's department; nothing before it is held.
	const allowed = (
		key:
			| "schedule:update"
			| "shift:read"
			| "shift:create"
			| "shift:update"
			| "shift:delete"
	): boolean => saved !== undefined && can(key, saved.departmentId);
	const canReadShifts = allowed("shift:read");
	const shifts = useShifts(companyId, saved, saved?.scheduleId, canReadShifts);
	// The first answer after a load ticks what the API keeps as included.
	if (saved && shifts.status === "ready" && !draft.shiftsSeeded)
		dispatch({ type: "shiftsLoaded", shifts: shifts.items });
	const departmentId = draft.setup?.departmentId;
	const [dialog, setDialog] = useState<{ editing?: Shift } | null>(null);
	const jobTitles = useJobTitles(
		companyId,
		{ ...JOB_TITLES, departmentId },
		dialog !== null && departmentId !== undefined
	);
	const scheduleActions = useScheduleActions(companyId);
	const shiftActions = useShiftActions(companyId);
	const [toast, setToast] = useState<{ id: number; message: string }>();
	const [problem, setProblem] = useState("");
	// Set when Next is refused, so the reason shows only after a try.
	const [blocked, setBlocked] = useState(false);
	const setupFormId = useId();

	const notify = useCallback((message: string): void => {
		setToast((previous) => ({ id: (previous?.id ?? 0) + 1, message }));
	}, []);
	const shiftRows = shifts.status === "ready" ? shifts.items : [];
	const canSaveSetup = allowed("schedule:update");
	const canAddShift = allowed("shift:create");
	// Changing a shift and changing which shifts are included are both `shift:update`.
	const canEditShifts = allowed("shift:update");
	const canDeleteShift = allowed("shift:delete");
	const deleteShift = useCallback(
		(shift: Shift): void => {
			if (!saved) return;
			setProblem("");
			shiftActions.deleteShift.mutate(
				{ unit: saved, scheduleId: saved.scheduleId, shiftId: shift.shiftId },
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
		},
		[shiftActions.deleteShift, notify, t, saved]
	);
	const deleteConstraint = useCallback(
		(constraint: Constraint): void => {
			dispatch({
				type: "constraintDeleted",
				constraintId: constraint.constraintId,
			});
			notify(t("scheduling.constraints.deleted"));
		},
		[notify, t]
	);
	const changeAllocation = useCallback(
		(shiftId: string, jobTitleId: string, allocated: number): void => {
			dispatch({ type: "allocationChanged", shiftId, jobTitleId, allocated });
		},
		[]
	);
	const openShiftDialog = useCallback((editing?: Shift): void => {
		setDialog({ editing });
	}, []);

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
				if (canSaveSetup)
					await scheduleActions.update.mutateAsync({
						unit: saved,
						scheduleId: saved.scheduleId,
						body: bodyOf(setup),
					});
				dispatch({ type: "setupSaved", setup });
				goTo(1);
				return undefined;
			}
			const department =
				departments.status === "ready"
					? departments.items.find(
							(item) => item.departmentId === setup.departmentId
						)
					: undefined;
			if (!department) return undefined;
			const created = await scheduleActions.create.mutateAsync({
				unit: {
					branchId: department.branchId,
					departmentId: department.departmentId,
				},
				body: bodyOf(setup),
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
	// Ticks differ from what the API keeps only once the shifts are listed.
	const inclusionChanged =
		shifts.status === "ready" &&
		!sameIds(draft.includedShiftIds, includedIdsOf(shiftRows));
	// Sends only what the person may change: the setup, then the ticks if they moved.
	const saveDraft = async (): Promise<void> => {
		if (!saved || !draft.setup) return;
		setProblem("");
		const target = { unit: saved, scheduleId: saved.scheduleId };
		try {
			if (canSaveSetup)
				await scheduleActions.update.mutateAsync({
					...target,
					body: bodyOf(draft.setup),
				});
		} catch (error) {
			setProblem(scheduleRefusalMessage(error, false, t));
			return;
		}
		try {
			if (canEditShifts && inclusionChanged)
				await shiftActions.includeShifts.mutateAsync({
					...target,
					includedShiftIds: draft.includedShiftIds,
				});
		} catch (error) {
			setProblem(inclusionRefusal(error, t));
			return;
		}
		notify(t("scheduling.draft.saved"));
	};
	const included = includedShifts(draft, shiftRows);
	const summary = summarise(included, draft.allocations);
	const stepProblem =
		step === "shifts" && draft.includedShiftIds.length === 0
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
		shiftActions.includeShifts.isPending;
	const lockedDepartment = saved && {
		departmentId: saved.departmentId,
		name: saved.departmentName,
	};
	const onAddShift = canAddShift
		? (): void => {
				openShiftDialog();
			}
		: undefined;
	const onSaveDraft =
		step !== "setup" && (canSaveSetup || canEditShifts)
			? (): void => {
					void saveDraft();
				}
			: undefined;

	return (
		<>
			{header}
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
						defaultValues={setupDefaults}
						departments={departments}
						formId={setupFormId}
						lockedDepartment={lockedDepartment}
						periods={periods}
						onSubmit={submitSetup}
					/>
				)}
				{step === "shifts" && (
					<ShiftsStep
						includedShiftIds={draft.includedShiftIds}
						listProblem={shiftListProblem(shifts.status, canReadShifts, t)}
						problem={shownProblem}
						shifts={shiftRows}
						onAdd={onAddShift}
						onDelete={canDeleteShift ? deleteShift : undefined}
						onEdit={canEditShifts ? openShiftDialog : undefined}
						onIncludedChange={(shiftIds) => {
							dispatch({ type: "shiftsIncluded", shiftIds });
						}}
					/>
				)}
				{step === "constraints" && (
					<ConstraintsStep
						constraints={draft.constraints}
						includedConstraintIds={draft.includedConstraintIds}
						onDelete={deleteConstraint}
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
							dispatch({ type: "demandAutoFilled", shifts: shiftRows });
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
				nextDisabled={isLast}
				nextIcon={isLast ? <GenerateScheduleIcon /> : <ArrowRightIcon />}
				unavailableNote={t("scheduling.create.unavailable")}
				nextLabel={
					isLast
						? t("scheduling.actions.generate")
						: t("scheduling.actions.next")
				}
				onNext={step === "setup" || isLast ? undefined : next}
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
					jobTitles={jobTitles}
					onClose={() => {
						setDialog(null);
					}}
					onSave={async (body) => {
						const editing = dialog.editing;
						const target = { unit: saved, scheduleId: saved.scheduleId };
						const shift = editing
							? await shiftActions.updateShift.mutateAsync({
									...target,
									shiftId: editing.shiftId,
									body,
								})
							: await shiftActions.createShift.mutateAsync({
									...target,
									body,
								});
						// A new shift starts out included, as the API keeps it.
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
