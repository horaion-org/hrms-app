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
	rule: "Rest between shifts",
	action: { kind: "show" },
	...overrides,
});

/** A shift short, a must broken, a rule not met and a note. */
export const rosterIssuesFixture = (): Array<RosterIssue> => [
	rosterIssueFixture({
		key: "gap|1",
		who: "Front Desk Staff short",
		memberProfileId: null,
		day: "2026-10-17",
		time: "09:00–15:00",
		rule: "1 person short",
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
		rule: "Weekends off",
	}),
	rosterIssueFixture({
		key: "note|holiday",
		group: "forInformation",
		who: "Roster note",
		memberProfileId: null,
		day: null,
		rule: "Public holiday on Monday",
	}),
];
