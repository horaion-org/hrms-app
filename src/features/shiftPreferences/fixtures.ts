import type {
	MyPreferenceWeek,
	PreferenceDay,
	SchedulePreferenceOutcome,
	TeamPreferencePage,
} from "@/features/shiftPreferences/api";

/*
 * Synthetic shift preference data for tests and stories: no real person,
 * company or shift.
 */

/** The Monday every fixture week starts on. */
export const FIXTURE_WEEK = "2026-11-23";

const MORNING = {
	shiftId: "s-morning",
	name: "Morning",
	startTime: "07:00",
	endTime: "15:00",
};

const LATE = {
	shiftId: "s-late",
	name: "Late",
	startTime: "15:00",
	endTime: "23:00",
};

/** A day with Morning chosen and Late not, open to change. */
export const MONDAY_WITH_MORNING: PreferenceDay = {
	date: FIXTURE_WEEK,
	editable: true,
	shifts: [
		{ ...MORNING, preferred: true },
		{ ...LATE, preferred: false },
	],
};

/** A week with one preference on Monday and nothing on the other days. */
export const fixtureWeek = (): MyPreferenceWeek => ({
	weekStartMonday: FIXTURE_WEEK,
	maxShiftsPerDay: 5,
	days: [
		MONDAY_WITH_MORNING,
		...[
			"2026-11-24",
			"2026-11-25",
			"2026-11-26",
			"2026-11-27",
			"2026-11-28",
			"2026-11-29",
		].map((date) => ({
			date,
			editable: true,
			shifts: [
				{ ...MORNING, preferred: false },
				{ ...LATE, preferred: false },
			],
		})),
	],
});

/** A team page of one member who prefers Morning on Monday. */
export const fixtureTeamPage = (): TeamPreferencePage => ({
	content: [
		{
			membershipId: "m-1",
			displayName: "Alex Example",
			days: [
				{
					date: FIXTURE_WEEK,
					shifts: [{ shiftId: MORNING.shiftId, name: MORNING.name }],
				},
			],
		},
	],
	page: { totalElements: 1 },
});

/** One outcome of each kind for the same member on three days. */
export const fixtureOutcomes = (): Array<SchedulePreferenceOutcome> => [
	{
		membershipId: "m-1",
		date: FIXTURE_WEEK,
		shiftNames: ["Morning"],
		outcome: "MET",
		reason: null,
	},
	{
		membershipId: "m-1",
		date: "2026-11-24",
		shiftNames: ["Morning", "Late"],
		outcome: "NOT_MET",
		reason: null,
	},
	{
		membershipId: "m-1",
		date: "2026-11-25",
		shiftNames: ["Late"],
		outcome: "NOT_CONSIDERED",
		reason: "ON_LEAVE",
	},
];
