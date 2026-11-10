import type { CellChoicesState } from "@/features/scheduling/RosterCellPanel/cellPanelState";

/** Does nothing; stands in for a setter a story or test doesn't watch. */
const ignore = (): void => undefined;

/** A working day's choices with nothing picked yet, for stories and tests. */
export const cellChoicesFixture = (
	overrides: Partial<CellChoicesState> = {}
): CellChoicesState => ({
	modes: ["shift", "dayOff", "swap"],
	mode: undefined,
	chooseMode: ignore,
	shiftChoices: [],
	shiftId: undefined,
	setShiftId: ignore,
	partners: { available: [], unavailable: [] },
	partnerId: undefined,
	setPartnerId: ignore,
	leaveOptions: [],
	leaveType: undefined,
	setLeaveType: ignore,
	...overrides,
});
