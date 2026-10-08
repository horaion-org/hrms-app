import { Navigate, useNavigate, useSearch } from "@tanstack/react-router";
import { useCallback, useId, useReducer, useState } from "react";
import { useTranslation } from "react-i18next";
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
import { useDepartments } from "@/features/organisation/useOrganisationList";
import { ConstraintsStep } from "@/features/scheduling/ConstraintsStep";
import { ForecastStep } from "@/features/scheduling/ForecastStep";
import { GenerateStep } from "@/features/scheduling/GenerateStep";
import {
	formatPeriod,
	periodStartingOn,
	upcomingPeriods,
} from "@/features/scheduling/periods";
import {
	includedShifts,
	scheduleDraftReducer,
	seedScheduleDraft,
	summarise,
	type Constraint,
	type Shift,
} from "@/features/scheduling/scheduleDraft";
import { ScheduleSetupStep } from "@/features/scheduling/ScheduleSetupStep";
import type { ScheduleSetupValues } from "@/features/scheduling/setupSchema";
import { ShiftsStep } from "@/features/scheduling/ShiftsStep";
import { StepActions } from "@/features/scheduling/StepActions";
import { SCHEDULE_STEPS } from "@/features/scheduling/steps";

const DEPARTMENTS: ListQuery = {
	sort: { field: "name", desc: false },
	status: "ACTIVE",
};

/**
 * The Create Schedule steps: Setup, Shifts, Constraints, Forecast and
 * Generate. The URL names the current step; a step not yet reached sends the
 * person back to the furthest one they have. The draft is kept in the page
 * because there is no scheduling API yet, so leaving the page discards it.
 */
export const CreateSchedule = (): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const companyId = useCurrentCompanyId();
	const navigate = useNavigate();
	const { step = "setup" } = useSearch({
		from: "/_authenticated/_app/scheduling_/new",
	});
	const [draft, dispatch] = useReducer(
		scheduleDraftReducer,
		undefined,
		seedScheduleDraft
	);
	const [periods] = useState(() => upcomingPeriods(new Date()));
	const departments = useDepartments(companyId, DEPARTMENTS);
	const [toast, setToast] = useState<{ id: number; message: string }>();
	// Set when Next is refused, so the reason shows only after a try.
	const [blocked, setBlocked] = useState(false);
	const setupFormId = useId();

	const notify = useCallback((message: string): void => {
		setToast((previous) => ({ id: (previous?.id ?? 0) + 1, message }));
	}, []);
	const deleteShift = useCallback(
		(shift: Shift): void => {
			dispatch({ type: "shiftDeleted", shiftId: shift.shiftId });
			notify(t("scheduling.shifts.deleted"));
		},
		[notify, t]
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
		(shiftId: string, roleId: string, allocated: number): void => {
			dispatch({ type: "allocationChanged", shiftId, roleId, allocated });
		},
		[]
	);

	const current = SCHEDULE_STEPS.indexOf(step);
	if (current > draft.reached)
		return (
			<Navigate
				replace
				search={{ step: SCHEDULE_STEPS[draft.reached] ?? "setup" }}
				to="/scheduling/new"
			/>
		);

	const goTo = (index: number): void => {
		setBlocked(false);
		dispatch({ type: "stepReached", step: index });
		void navigate({
			to: "/scheduling/new",
			search: { step: SCHEDULE_STEPS[index] ?? "setup" },
		});
	};
	const summary = summarise(draft);
	const problem =
		step === "shifts" && draft.includedShiftIds.length === 0
			? t("scheduling.shifts.required")
			: step === "forecast" && summary.conflicts > 0
				? t("scheduling.forecast.overAllocated")
				: undefined;
	const shownProblem = blocked ? problem : undefined;
	const next = (): void => {
		if (problem) setBlocked(true);
		else goTo(current + 1);
	};
	const firstPeriod = periods[0];
	const setupDefaults: ScheduleSetupValues = draft.setup ?? {
		departmentId: "",
		name: "",
		periodStart: firstPeriod?.start ?? "",
		includeLeave: true,
		allowOpenShifts: false,
	};
	const period = draft.setup
		? periodStartingOn(draft.setup.periodStart)
		: firstPeriod;
	const periodLabel = period
		? formatPeriod(period, i18n.resolvedLanguage ?? i18n.language)
		: "";
	const isLast = current === SCHEDULE_STEPS.length - 1;

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
						periods={periods}
						onSubmit={(setup) => {
							dispatch({ type: "setupSaved", setup });
							goTo(1);
						}}
					/>
				)}
				{step === "shifts" && (
					<ShiftsStep
						includedShiftIds={draft.includedShiftIds}
						problem={shownProblem}
						shifts={draft.shifts}
						onDelete={deleteShift}
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
						demand={draft.demand}
						mode={draft.forecastMode}
						periodLabel={periodLabel}
						problem={shownProblem}
						shifts={includedShifts(draft)}
						onAllocationChange={changeAllocation}
						onAutoFill={() => {
							dispatch({ type: "demandAutoFilled" });
						}}
						onDemandChange={(slotStart, roleId, staff) => {
							dispatch({ type: "demandChanged", slotStart, roleId, staff });
						}}
						onModeChange={(mode) => {
							dispatch({ type: "forecastModeChosen", mode });
						}}
					/>
				)}
				{step === "generate" && <GenerateStep summary={summary} />}
			</div>
			<StepActions
				className="mt-12"
				form={step === "setup" ? setupFormId : undefined}
				nextDisabled={isLast}
				nextIcon={isLast ? <GenerateScheduleIcon /> : <ArrowRightIcon />}
				saveDraft={step !== "setup"}
				unavailableNote={t("scheduling.create.unavailable")}
				nextLabel={
					isLast
						? t("scheduling.actions.generate")
						: t("scheduling.actions.next")
				}
				onNext={step === "setup" || isLast ? undefined : next}
				onBack={
					current > 0
						? (): void => {
								goTo(current - 1);
							}
						: undefined
				}
			/>
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
