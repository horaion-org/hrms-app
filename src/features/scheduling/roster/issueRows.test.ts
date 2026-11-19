import { describe, expect, it } from "vitest";
import { authTestI18n } from "@/features/auth/testingI18n";
import {
	issueRows,
	mustFixCount,
	rowsOfFilter,
	type IssueFilter,
	type IssueRowSources,
} from "@/features/scheduling/roster/issueRows";
import {
	rosterIssueFixture,
	rosterIssuesFixture,
} from "@/features/scheduling/roster/rosterIssueFixtures";

const SOURCES: IssueRowSources = {
	hasFix: (issueKey) => issueKey === "mustFix|rest|mp-1|2026-10-14",
	shiftName: (shiftId) => (shiftId === "front-desk-am" ? "Front Desk AM" : ""),
	formatOne: (day) => (day === "2026-10-17" ? "Sat, Oct 17" : "Wed, Oct 14"),
	t: authTestI18n.t,
};

/** The fixture's four issues in a jumbled order, a second must on an earlier day among them. */
const jumbled = (): ReturnType<typeof rosterIssuesFixture> => {
	const [gap, must, notMet, note] = rosterIssuesFixture();
	return [
		note!,
		notMet!,
		gap!,
		must!,
		rosterIssueFixture({
			key: "mustFix|days|mp-3|2026-10-12",
			who: "Chen Wei",
			memberProfileId: "mp-3",
			day: "2026-10-12",
			ruleName: "Most days a week",
		}),
	];
};

describe("issueRows", () => {
	it("orders must fix, then if possible, then notes, each by day", () => {
		expect(issueRows(jumbled(), SOURCES).map((row) => row.key)).toEqual([
			"mustFix|days|mp-3|2026-10-12",
			"mustFix|rest|mp-1|2026-10-14",
			"gap|1",
			"notMet|weekends|mp-2",
			"note|holiday",
		]);
	});

	it.each([
		[
			"gap|1",
			"mustFix",
			"1 Front Desk Staff short",
			"Sat, Oct 17 · Front Desk AM 09:00–15:00",
			"cover",
		],
		[
			"mustFix|rest|mp-1|2026-10-14",
			"mustFix",
			"Rules broken",
			"Aisha Rahman · Wed, Oct 14",
			"fix",
		],
		[
			"mustFix|days|mp-3|2026-10-12",
			"mustFix",
			"Most days a week",
			"Chen Wei · Wed, Oct 14",
			"details",
		],
		["notMet|weekends|mp-2", "ifPossible", "Asked if possible", "Ben Ortiz", "details"],
		[
			"note|holiday",
			"note",
			"Days before changed",
			"5 people’s days before this week changed",
			"details",
		],
	])("words %s as %s: %s at %s, with %s", (key, severity, what, where, action) => {
		const row = issueRows(jumbled(), SOURCES).find(
			(candidate) => candidate.key === key
		);
		expect(row).toMatchObject({ severity, what, where, action });
	});

	it("names a person's leave that leaves a shift short by its own sentence", () => {
		const [row] = issueRows(
			[
				rosterIssueFixture({
					key: "gap|front-desk-am|2026-10-17",
					rule: "On leave, so Front Desk AM is short.",
					day: "2026-10-17",
					time: "09:00–15:00",
					action: {
						kind: "findCover",
						gap: { shiftId: "front-desk-am", day: "2026-10-17" },
					},
				}),
			],
			SOURCES
		);
		expect(row?.what).toBe("On leave, so Front Desk AM is short.");
	});
});

describe("rowsOfFilter and mustFixCount", () => {
	it.each<[IssueFilter, number]>([
		["all", 5],
		["mustFix", 3],
		["ifPossible", 1],
	])("shows %s as %s rows", (filter, count) => {
		expect(rowsOfFilter(issueRows(jumbled(), SOURCES), filter)).toHaveLength(
			count
		);
	});

	it("counts the rows to fix", () => {
		expect(mustFixCount(issueRows(jumbled(), SOURCES))).toBe(3);
	});
});
