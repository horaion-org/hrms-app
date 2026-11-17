import type { RosterIssue } from "@/features/scheduling/roster/rosterIssueGroups";

/*
 * Issues as the Issues tab lists them, for stories and tests; never sent
 * anywhere. Schedule s-1's week of 12 October.
 */

/** One issue, a broken must on Aisha Rahman's Wednesday unless overridden. */
export const rosterIssueFixture = (
	overrides: Partial<RosterIssue> = {}
): RosterIssue => ({
	key: "mustFix|rest|mp-1|2026-10-14",
	group: "mustFix",
	who: "Aisha Rahman",
	memberProfileId: "mp-1",
	day: "2026-10-14",
	time: null,
	rule: "A rule that must hold is broken here. Change this day by hand, then validate again. Rule: Rest between shifts",
	action: { kind: "show" },
	...overrides,
});

/** A shift short, a must broken, a rule not met and a note. */
export const rosterIssuesFixture = (): Array<RosterIssue> => [
	rosterIssueFixture({
		key: "gap|1",
		who: "1 Front Desk Staff short",
		memberProfileId: null,
		day: "2026-10-17",
		time: "09:00–15:00",
		rule: "Not enough people on this shift. Find someone to cover it. Rule: Early front desk",
		action: {
			kind: "findCover",
			gap: { shiftId: "front-desk-am", day: "2026-10-17" },
		},
	}),
	rosterIssueFixture(),
	rosterIssueFixture({
		key: "notMet|weekends|mp-2",
		group: "notMet",
		who: "Ben Ortiz",
		memberProfileId: "mp-2",
		day: null,
		rule: "Asked for if possible, and this roster could not meet it. Rule: Weekends off",
	}),
	rosterIssueFixture({
		key: "note|holiday",
		group: "forInformation",
		who: "5 people’s days before this week changed",
		memberProfileId: null,
		day: null,
		rule: "This roster was generated from what was known then. To plan from the days as they are now, regenerate the month from its page.",
	}),
];
