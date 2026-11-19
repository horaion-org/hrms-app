import { describe, expect, it } from "vitest";
import { authTestI18n } from "@/features/auth/testingI18n";
import {
	deletedScheduleFixture,
	generatedScheduleFixture,
	scheduleFixture,
} from "@/features/scheduling/schedules/fixtures";
import {
	deletionDate,
	deletionLineOf,
	deletionSentence,
	historyRowsOf,
} from "@/features/scheduling/schedules/historyRows";

const t = authTestI18n.t.bind(authTestI18n);

describe("historyRowsOf", () => {
	const older = scheduleFixture({
		scheduleId: "s-old",
		updatedAt: "2026-10-01T08:00:00Z",
	});
	const newer = generatedScheduleFixture({
		scheduleId: "s-new",
		updatedAt: "2026-10-20T08:00:00Z",
	});
	// Deleted on 15 October: between the two live schedules' last updates.
	const deleted = deletedScheduleFixture({ scheduleId: "s-deleted" });

	it.each([
		["no schedule at all", [], [], []],
		["live schedules only", [newer, older], [], ["s-new", "s-old"]],
		["deleted schedules only", [], [deleted], ["s-deleted"]],
		[
			"a deletion between two updates",
			[newer, older],
			[deleted],
			["s-new", "s-deleted", "s-old"],
		],
		[
			"live schedules given oldest first",
			[older, newer],
			[deleted],
			["s-new", "s-deleted", "s-old"],
		],
	] as const)("lists %s by what changed last", (_, live, gone, expected) => {
		expect(
			historyRowsOf(live, gone).map((row) => row.schedule.scheduleId)
		).toEqual(expected);
	});

	it("marks which rows are deleted, so a deleted one never gets a live row's actions", () => {
		expect(historyRowsOf([newer], [deleted]).map((row) => row.deleted)).toEqual(
			[false, true]
		);
	});
});

describe("deletionLineOf", () => {
	it.each([
		["MANAGER", "Lina Tan", "byLine", "Lina Tan"],
		// A manager who has since left: only when is known.
		["MANAGER", null, "onLine", undefined],
		// A later run replaced it; who asked for that run is not said.
		["REPLACED", "Lina Tan", "replacedLine", undefined],
		["REPLACED", null, "replacedLine", undefined],
		// Deleted before the API recorded who and why.
		[null, null, "onLine", undefined],
		[null, "Lina Tan", "byLine", "Lina Tan"],
	] as const)(
		"given cause %s and the name %s, words it with %s",
		(cause, deletedByName, line, name) => {
			expect(
				deletionLineOf({
					deletedAt: "2026-10-15T03:00:00Z",
					deletedByName,
					cause,
				})
			).toEqual({
				labelKey: `scheduling.history.deleted.${line}`,
				...(name && { name }),
			});
		}
	);
});

describe("deletionSentence", () => {
	it("reads the day in the schedule's own time zone, not the reader's", () => {
		// 23:30 UTC on the 14th is already the 15th in Singapore.
		const lateEvening = deletedScheduleFixture({
			deletion: {
				deletedAt: "2026-10-14T23:30:00Z",
				deletedByName: null,
				cause: null,
			},
		});

		expect(deletionDate(lateEvening, "en-GB")).toBe("15 Oct 2026");
	});

	it.each([
		["MANAGER", "Lina Tan", "Deleted by Lina Tan on 15 Oct 2026"],
		["REPLACED", "Lina Tan", "Replaced by a new roster on 15 Oct 2026"],
		[null, null, "Deleted on 15 Oct 2026"],
	] as const)(
		"given cause %s and the name %s, says so in words",
		(cause, deletedByName, sentence) => {
			const schedule = deletedScheduleFixture({
				deletion: { deletedAt: "2026-10-15T03:00:00Z", deletedByName, cause },
			});

			expect(deletionSentence(schedule, t, "en-GB")).toBe(sentence);
		}
	);
});
