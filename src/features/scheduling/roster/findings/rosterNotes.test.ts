import { describe, expect, it } from "vitest";
import type { Finding } from "@/features/scheduling/roster/findings/finding";
import {
	isOnShownDays,
	rosterNotes,
} from "@/features/scheduling/roster/findings/rosterNotes";
import {
	emptyFindingsFixture,
	findingsOfEveryKindFixture,
} from "@/features/scheduling/schedules/fixtures";

const WEEK = [
	"2026-10-12",
	"2026-10-13",
	"2026-10-14",
	"2026-10-15",
	"2026-10-16",
	"2026-10-17",
	"2026-10-18",
];

/** A finding by what tells it apart: a conflict's id or a message's text. */
const summary = (finding: Finding): string => {
	if (finding.kind === "conflict") return finding.conflict.conflictId;
	if (finding.kind === "message") return finding.message;
	return finding.diagnostic.code;
};

describe("rosterNotes", () => {
	it("given_aWeekOfFindings_when_grouped_then_eachDaysNotesThenEachMembers", () => {
		const notes = rosterNotes(findingsOfEveryKindFixture(), WEEK);

		expect(
			notes.byDate.map(({ date, findings }) => [date, findings.map(summary)])
		).toEqual([
			["2026-10-16", ["cf-3", "cf-2", "Friday is short of one Cashier."]],
			["2026-10-17", ["cf-1"]],
		]);
		expect(
			notes.byMember.map(({ memberProfileId, findings }) => [
				memberProfileId,
				findings.map(summary),
			])
		).toEqual([
			["mp-2", ["cf-4", "Ben Ong works more than five days in a row."]],
			["mp-9", ["An unknown member is short of rest."]],
			["mp-3", ["Chen Wei covers the Sunday swing alone."]],
		]);
	});

	it("given_onlySomeDaysInView_when_grouped_then_dropsNotesOnOtherDays", () => {
		const notes = rosterNotes(findingsOfEveryKindFixture(), WEEK.slice(0, 5));

		expect(notes.byDate.map(({ date }) => date)).toEqual(["2026-10-16"]);
		expect(
			notes.byMember.map(({ memberProfileId, findings }) => [
				memberProfileId,
				findings.map(summary),
			])
		).toEqual([
			["mp-2", ["Ben Ong works more than five days in a row."]],
			["mp-9", ["An unknown member is short of rest."]],
		]);
	});

	it("given_aNoteNamingNeitherMemberNorDay_when_grouped_then_isForTheWholeRoster", () => {
		const notes = rosterNotes(
			{
				...emptyFindingsFixture(),
				errors: [{ employeeId: null, date: null, messages: ["Odd."] }],
			},
			WEEK
		);

		expect(notes.byMember).toEqual([
			{
				memberProfileId: null,
				findings: [{ kind: "message", date: null, message: "Odd." }],
			},
		]);
	});

	it("given_nothingFound_when_grouped_then_isEmpty", () => {
		expect(rosterNotes(emptyFindingsFixture(), WEEK)).toEqual({
			byDate: [],
			byMember: [],
		});
	});
});

describe("isOnShownDays", () => {
	it("given_aDayOrNone_when_checked_then_onlyAnotherDayIsHidden", () => {
		const shown = new Set(["2026-10-12"]);

		expect(isOnShownDays("2026-10-12", shown)).toBe(true);
		expect(isOnShownDays("2026-10-19", shown)).toBe(false);
		expect(isOnShownDays(null, shown)).toBe(true);
	});
});
