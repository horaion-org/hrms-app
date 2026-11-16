/*
 * How much of a normal working day a leave duration leaves to work, so the
 * dialog can say when ticking "Can still work a shift that day" would leave
 * the person very little of a shift (the API's ADR-0099: the tick alone
 * decides, whatever is left). Pure.
 */

/** A normal working day, against which a duration's leftover is judged. */
const NORMAL_DAY_MINUTES = 8 * 60;

/** Less than this left of a normal day is "very little": two hours. */
const LITTLE_LEFT_MINUTES = 2 * 60;

/** Whether a duration this long leaves very little of a normal working day to work. */
export const leavesLittleOfADay = (leaveMinutes: number): boolean =>
	NORMAL_DAY_MINUTES - leaveMinutes < LITTLE_LEFT_MINUTES;
