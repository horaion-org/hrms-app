import type {
	DatesGeneration,
	DatesPlan,
	PartDays,
} from "@/features/scheduling/dates/api";

/*
 * API-shaped dates plans for stories and tests; never sent anywhere. The
 * default is the design's example: Kitchen (d-1), Thursday 19 to Saturday
 * 28 November 2026, nothing rostered before.
 */

/** Thu 19 – Sat 28 Nov: two new parts, Monday to Wednesday of the first week not rostered. */
export const datesPlanFixture = (
	overrides: Partial<DatesPlan> = {}
): DatesPlan => ({
	firstDay: "2026-11-19",
	lastDay: "2026-11-28",
	departmentId: "d-1",
	timeZone: "Asia/Singapore",
	newDays: 10,
	weeks: [
		{
			periodStart: "2026-11-16",
			periodEnd: "2026-11-22",
			askedFrom: "2026-11-19",
			askedTo: "2026-11-22",
			newFrom: "2026-11-19",
			newTo: "2026-11-22",
			action: "CREATE_AND_GENERATE",
			draftId: null,
			kept: [],
			redone: [],
			rest: [],
		},
		{
			periodStart: "2026-11-23",
			periodEnd: "2026-11-29",
			askedFrom: "2026-11-23",
			askedTo: "2026-11-28",
			newFrom: "2026-11-23",
			newTo: "2026-11-28",
			action: "CREATE_AND_GENERATE",
			draftId: null,
			kept: [],
			redone: [],
			rest: [],
		},
	],
	notRosteredBefore: { from: "2026-11-16", to: "2026-11-18" },
	refusal: null,
	...overrides,
});

/** The same dates with the second week already published: it is kept. */
export const datesPlanWithKeptWeekFixture = (): DatesPlan => {
	const plan = datesPlanFixture();
	const [first, second] = plan.weeks;
	return {
		...plan,
		newDays: 4,
		weeks: [
			first!,
			{
				...second!,
				newFrom: null,
				newTo: null,
				action: "KEEP",
				kept: [
					{
						scheduleId: "s-9",
						coveredFrom: "2026-11-23",
						coveredTo: "2026-11-29",
						state: "PUBLISHED",
					},
				],
			},
		],
	};
};

/** Some days of the week of 16 Nov's whole schedule, s-1, awaiting review. */
const weekPartDays = (coveredFrom: string, coveredTo: string): PartDays => ({
	scheduleId: "s-1",
	coveredFrom,
	coveredTo,
	state: "TO_REVIEW",
});

/**
 * The owner's example (API ADR-0129): the week of 16 Nov generated whole and
 * awaiting review, Wed 18 – Thu 19 asked. Mon – Tue stay, Wed – Thu are
 * scheduled again with the run's choices, Fri – Sun with the week's own.
 */
export const datesPlanRedoingFixture = (): DatesPlan => ({
	firstDay: "2026-11-18",
	lastDay: "2026-11-19",
	departmentId: "d-1",
	timeZone: "Asia/Singapore",
	newDays: 2,
	weeks: [
		{
			periodStart: "2026-11-16",
			periodEnd: "2026-11-22",
			askedFrom: "2026-11-18",
			askedTo: "2026-11-19",
			newFrom: "2026-11-18",
			newTo: "2026-11-19",
			action: "CREATE_AND_GENERATE",
			draftId: null,
			kept: [weekPartDays("2026-11-16", "2026-11-17")],
			redone: [weekPartDays("2026-11-18", "2026-11-19")],
			rest: [weekPartDays("2026-11-20", "2026-11-22")],
		},
	],
	notRosteredBefore: null,
	refusal: null,
});

/** Both weeks of `datesPlanFixture` started. */
export const datesGenerationFixture = (
	overrides: Partial<DatesGeneration> = {}
): DatesGeneration => ({
	firstDay: "2026-11-19",
	lastDay: "2026-11-28",
	departmentId: "d-1",
	weeks: [
		{
			periodStart: "2026-11-16",
			scheduleId: "s-new-1",
			outcome: "STARTED",
			reason: null,
		},
		{
			periodStart: "2026-11-23",
			scheduleId: "s-new-2",
			outcome: "STARTED",
			reason: null,
		},
	],
	...overrides,
});
