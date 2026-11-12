import type {
	StartingCell,
	StartingDays,
} from "@/features/scheduling/startingContext/api";

/** The 7 days nearest the period starting Monday 9 November 2026. */
export const WEEK_BEFORE = [
	"2026-11-02",
	"2026-11-03",
	"2026-11-04",
	"2026-11-05",
	"2026-11-06",
	"2026-11-07",
	"2026-11-08",
];

/** The 7 days before those, which the dialog shows on request. */
export const EARLIER_WEEK = [
	"2026-10-26",
	"2026-10-27",
	"2026-10-28",
	"2026-10-29",
	"2026-10-30",
	"2026-10-31",
	"2026-11-01",
];

/** The 14 days before the period, oldest first, as the API answers them. */
export const DAYS_BEFORE = [...EARLIER_WEEK, ...WEEK_BEFORE];

/** A day nobody knows anything about. */
export const unknownCell = (date: string): StartingCell => ({
	date,
	kind: null,
	source: null,
	locked: false,
	dayType: null,
	shiftId: null,
	shiftName: null,
	startTime: null,
	endTime: null,
});

/** A day a published roster covers: locked. */
export const rosterOffCell = (date: string): StartingCell => ({
	...unknownCell(date),
	kind: "OFF",
	source: "PUBLISHED",
	locked: true,
});

/** A day approved leave covers: locked. */
export const leaveCell = (date: string): StartingCell => ({
	...unknownCell(date),
	kind: "LEAVE",
	source: "LEAVE",
	locked: true,
});

/** A Night shift a scheduler entered. */
export const enteredNightCell = (date: string): StartingCell => ({
	...unknownCell(date),
	kind: "WORKED",
	source: "ENTERED",
	shiftId: "s-night",
	shiftName: "Night",
	startTime: "22:00",
	endTime: "06:00",
});

/**
 * A first roster: no previous roster, Tan with an entered Sunday night and
 * leave on Saturday, Siti unknown; nothing known in the earlier week.
 */
export const firstWeek = (): StartingDays => ({
	days: DAYS_BEFORE,
	previousRoster: null,
	shifts: [
		{ shiftId: "s-day", name: "Day", startTime: "07:00", endTime: "19:00" },
		{ shiftId: "s-night", name: "Night", startTime: "22:00", endTime: "06:00" },
	],
	members: [
		{
			memberProfileId: "p-tan",
			displayName: "Tan Wei Ming",
			jobTitleName: "Officer",
			cells: DAYS_BEFORE.map((date) =>
				date === "2026-11-08"
					? enteredNightCell(date)
					: date === "2026-11-07"
						? leaveCell(date)
						: unknownCell(date)
			),
		},
		{
			memberProfileId: "p-siti",
			displayName: "Siti Rahmah",
			jobTitleName: "Officer",
			cells: DAYS_BEFORE.map(unknownCell),
		},
	],
});

/** Published rosters cover both weeks for Tan; Siti, a new joiner, is on neither. */
export const carriedWeek = (): StartingDays => ({
	...firstWeek(),
	previousRoster: {
		scheduleId: "sch-45",
		name: "Week 45",
		status: "PUBLISHED",
		periodStart: "2026-11-02",
	},
	members: [
		{
			memberProfileId: "p-tan",
			displayName: "Tan Wei Ming",
			jobTitleName: "Officer",
			cells: DAYS_BEFORE.map(rosterOffCell),
		},
		{
			memberProfileId: "p-siti",
			displayName: "Siti Rahmah",
			jobTitleName: "Officer",
			cells: DAYS_BEFORE.map(unknownCell),
		},
	],
});

/** The first roster with Siti's Friday of the earlier week typed as a day off. */
export const earlierDayTypedWeek = (): StartingDays => {
	const week = firstWeek();
	return {
		...week,
		members: week.members.map((member) =>
			member.memberProfileId === "p-siti"
				? {
						...member,
						cells: member.cells.map((cell) =>
							cell.date === "2026-10-30"
								? { ...unknownCell(cell.date), kind: "OFF", source: "ENTERED" }
								: cell
						),
					}
				: member
		),
	};
};

/** A day off of a type, entered by a scheduler. */
const enteredDayOffCell = (date: string, dayType: string): StartingCell => ({
	...unknownCell(date),
	kind: "OFF",
	source: "ENTERED",
	dayType,
});

/**
 * The first roster with typed days off: Tan's Thursday a rest day a
 * published roster covers (locked); Siti's Friday an entered rest day and
 * her Saturday an entered type the schedule no longer offers.
 */
export const typedDaysOffWeek = (): StartingDays => {
	const week = firstWeek();
	const typedCell = (
		memberProfileId: string,
		cell: StartingCell
	): StartingCell => {
		if (memberProfileId === "p-tan" && cell.date === "2026-11-05")
			return { ...rosterOffCell(cell.date), dayType: "REST" };
		if (memberProfileId === "p-siti" && cell.date === "2026-11-06")
			return enteredDayOffCell(cell.date, "REST");
		if (memberProfileId === "p-siti" && cell.date === "2026-11-07")
			return enteredDayOffCell(cell.date, "PUBLIC_HOLIDAY_OFF");
		return cell;
	};
	return {
		...week,
		members: week.members.map((member) => ({
			...member,
			cells: member.cells.map((cell) =>
				typedCell(member.memberProfileId, cell)
			),
		})),
	};
};
