import { useReducer } from "react";
import {
	forecastShiftsOf,
	forecastStepPropsOf,
	type DraftForecastProps,
} from "@/features/scheduling/createSchedule/forecastStepProps";
import {
	emptyScheduleDraft,
	scheduleDraftReducer,
} from "@/features/scheduling/scheduleDraft";
import type { DepartmentShift } from "@/features/scheduling/shifts/api";

/**
 * The Forecast step's props for a page with no draft of its own (the month
 * and dates run): an empty forecast kept while the page is open, over the
 * Department's live shifts. Nothing it holds is sent anywhere.
 */
export const useForecastStepProps = (
	departmentShifts: ReadonlyArray<DepartmentShift> | undefined
): DraftForecastProps => {
	const [forecast, dispatch] = useReducer(
		scheduleDraftReducer,
		undefined,
		emptyScheduleDraft
	);
	return forecastStepPropsOf(
		forecast,
		dispatch,
		forecastShiftsOf(departmentShifts ?? [])
	);
};
