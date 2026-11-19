import type { ForecastStepProps } from "@/features/scheduling/createSchedule/ForecastStep";
import type {
	ScheduleDraft,
	ScheduleDraftAction,
} from "@/features/scheduling/scheduleDraft";
import type { ScheduleShift } from "@/features/scheduling/schedules/api";
import type { DepartmentShift } from "@/features/scheduling/shifts/api";

/** The Forecast step's props a draft decides: everything but the period it names. */
export type DraftForecastProps = Omit<ForecastStepProps, "periodLabel">;

/** The Forecast step's rows for a Department's live shifts, each one used. */
export const forecastShiftsOf = (
	shifts: ReadonlyArray<DepartmentShift>
): Array<ScheduleShift> =>
	shifts.map((shift) => ({ ...shift, included: true, frozen: false }));

/**
 * The Forecast step's props from the draft the page holds: its numbers, which
 * start empty, and the changes sent to the draft's reducer. The numbers stay
 * in the page: no request reads them.
 */
export const forecastStepPropsOf = (
	draft: Pick<ScheduleDraft, "allocations" | "demand" | "forecastMode">,
	dispatch: (action: ScheduleDraftAction) => void,
	shifts: Array<ScheduleShift>
): DraftForecastProps => ({
	allocations: draft.allocations,
	demand: draft.demand,
	mode: draft.forecastMode,
	shifts,
	onAllocationChange: (shiftId, jobTitleId, allocated) => {
		dispatch({ type: "allocationChanged", shiftId, jobTitleId, allocated });
	},
	onAutoFill: () => {
		dispatch({ type: "demandAutoFilled", shifts });
	},
	onDemandChange: (slotStart, jobTitleId, staff) => {
		dispatch({ type: "demandChanged", slotStart, jobTitleId, staff });
	},
	onModeChange: (mode) => {
		dispatch({ type: "forecastModeChosen", mode });
	},
});
