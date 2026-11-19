import { describe, expect, it, vi } from "vitest";
import {
	forecastShiftsOf,
	forecastStepPropsOf,
} from "@/features/scheduling/createSchedule/forecastStepProps";
import {
	emptyScheduleDraft,
	type ScheduleDraftAction,
} from "@/features/scheduling/scheduleDraft";
import {
	SHIFT_FIXTURES,
	departmentShiftFixture,
} from "@/features/scheduling/shifts/fixtures";

const SHIFTS = forecastShiftsOf(
	SHIFT_FIXTURES.map((shift) => departmentShiftFixture(shift))
);

describe("forecastShiftsOf", () => {
	it("given_aDepartmentsShifts_when_mapped_then_eachIsUsedAndNotFrozen", () => {
		expect(SHIFTS).toHaveLength(SHIFT_FIXTURES.length);
		expect(SHIFTS.every((shift) => shift.included && !shift.frozen)).toBe(true);
	});
});

describe("forecastStepPropsOf", () => {
	it("given_anEmptyDraft_when_mapped_then_theStepStartsEmptyByShift", () => {
		const props = forecastStepPropsOf(emptyScheduleDraft(), vi.fn(), SHIFTS);

		expect(props).toMatchObject({
			allocations: {},
			demand: {},
			mode: "SHIFT",
			shifts: SHIFTS,
		});
	});

	it("given_eachChange_when_made_then_itIsSentToTheDraftsReducer", () => {
		const dispatch = vi.fn<(action: ScheduleDraftAction) => void>();
		const props = forecastStepPropsOf(emptyScheduleDraft(), dispatch, SHIFTS);

		props.onAllocationChange("front-desk-am", "jt-1", 2);
		props.onDemandChange("09:00", "jt-1", 3);
		props.onModeChange("BLOCKS");
		props.onAutoFill();

		expect(dispatch.mock.calls.map((call) => call[0])).toEqual([
			{
				type: "allocationChanged",
				shiftId: "front-desk-am",
				jobTitleId: "jt-1",
				allocated: 2,
			},
			{
				type: "demandChanged",
				slotStart: "09:00",
				jobTitleId: "jt-1",
				staff: 3,
			},
			{ type: "forecastModeChosen", mode: "BLOCKS" },
			{ type: "demandAutoFilled", shifts: SHIFTS },
		]);
	});
});
