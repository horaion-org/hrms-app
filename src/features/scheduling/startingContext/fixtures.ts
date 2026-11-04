import type {
	StartingCell,
	StartingDays,
} from "@/features/scheduling/startingContext/api";

/** The 7 days before the period starting Monday 9 November 2026. */
export const WEEK_BEFORE = [
	"2026-11-02",
	"2026-11-03",
	"2026-11-04",
	"2026-11-05",
	"2026-11-06",
	"2026-11-07",
	"2026-11-08",
];

/** A day nobody knows anything about. */
export const unknownCell = (date: string): StartingCell => ({
	date,
	kind: null,
	source: null,
	locked: false,
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

/** A first roster: no previous roster, Tan with an entered Sunday night and leave on Saturday, Siti unknown. */
export const firstWeek = (): StartingDays => ({
	days: WEEK_BEFORE,
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
			cells: WEEK_BEFORE.map((date) =>
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
			cells: WEEK_BEFORE.map(unknownCell),
		},
	],
});

/** A week a published roster covers for Tan; Siti, a new joiner, is not on it. */
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
			cells: WEEK_BEFORE.map(rosterOffCell),
		},
		{
			memberProfileId: "p-siti",
			displayName: "Siti Rahmah",
			jobTitleName: "Officer",
			cells: WEEK_BEFORE.map(unknownCell),
		},
	],
});
