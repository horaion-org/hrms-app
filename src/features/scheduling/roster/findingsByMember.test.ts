import { describe, expect, it } from "vitest";
import {
	findingsByMember,
	reviewNoteCount,
} from "@/features/scheduling/roster/findingsByMember";
import { generationFindingsFixture } from "@/features/scheduling/schedules/fixtures";

describe("findingsByMember", () => {
	it("given_errorsAboutMembers_when_grouped_then_namesEachInOrderOfFirstMention", () => {
		const groups = findingsByMember(
			generationFindingsFixture({
				errors: [
					{ employeeId: "mp-2", date: "2026-10-17", messages: ["First."] },
					{ employeeId: "mp-1", date: null, messages: ["Second."] },
					{
						employeeId: "mp-2",
						date: "2026-10-18",
						messages: ["Third.", "Fourth."],
					},
				],
			})
		);

		expect(groups).toEqual([
			{
				memberProfileId: "mp-2",
				name: "Ben Ong",
				entries: [
					{ date: "2026-10-17", messages: ["First."] },
					{ date: "2026-10-18", messages: ["Third.", "Fourth."] },
				],
			},
			{
				memberProfileId: "mp-1",
				name: "Aisha Rahman",
				entries: [{ date: null, messages: ["Second."] }],
			},
		]);
	});

	it("given_aMemberThatDidNotResolve_when_grouped_then_leavesTheNameOut", () => {
		const groups = findingsByMember(
			generationFindingsFixture({
				errors: [{ employeeId: "mp-9", date: null, messages: ["Gone."] }],
				members: [
					{ memberProfileId: "mp-9", membershipId: null, displayName: null },
				],
			})
		);

		expect(groups).toEqual([
			{
				memberProfileId: "mp-9",
				name: null,
				entries: [{ date: null, messages: ["Gone."] }],
			},
		]);
	});

	it("given_anIdMissingFromMembers_when_grouped_then_leavesTheNameOut", () => {
		const [group] = findingsByMember({
			errors: [{ employeeId: "mp-7", date: null, messages: ["Unknown."] }],
			members: [],
		});

		expect(group).toMatchObject({ memberProfileId: "mp-7", name: null });
	});

	it("given_errorsNamingNoMember_when_grouped_then_keepsThemTogether", () => {
		const groups = findingsByMember({
			errors: [
				{ employeeId: null, date: "2026-10-12", messages: ["Monday."] },
				{ employeeId: null, date: "2026-10-13", messages: ["Tuesday."] },
			],
			members: [],
		});

		expect(groups).toEqual([
			{
				memberProfileId: null,
				name: null,
				entries: [
					{ date: "2026-10-12", messages: ["Monday."] },
					{ date: "2026-10-13", messages: ["Tuesday."] },
				],
			},
		]);
	});
});

describe("reviewNoteCount", () => {
	it("given_conflictsAndErrors_when_counted_then_countsEachConflictAndMessage", () => {
		expect(
			reviewNoteCount(
				generationFindingsFixture({
					errors: [
						{ employeeId: "mp-1", date: null, messages: ["One.", "Two."] },
					],
				})
			)
		).toBe(3);
	});

	it("given_nothingToReview_when_counted_then_isZero", () => {
		expect(reviewNoteCount({ errors: [], conflicts: [] })).toBe(0);
	});
});
