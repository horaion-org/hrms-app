import { describe, expect, it } from "vitest";
import {
	generatedScheduleFixture,
	scheduleFixture,
} from "@/features/scheduling/schedules/fixtures";
import { scheduleDecision } from "./scheduleDecision";

describe("scheduleDecision", () => {
	it("has nothing to decide without a roster", () => {
		expect(scheduleDecision(scheduleFixture())).toBeNull();
		expect(scheduleDecision(generatedScheduleFixture())).toBeNull();
		expect(
			scheduleDecision(
				generatedScheduleFixture({ status: "GENERATION_FAILED" })
			)
		).toBeNull();
	});

	it("waits for a decision on a generated roster", () => {
		expect(
			scheduleDecision(generatedScheduleFixture({ status: "GENERATED" }))
		).toEqual({ kind: "pending" });
	});

	it("names who published a roster and when, without a reason", () => {
		expect(
			scheduleDecision(generatedScheduleFixture({ status: "PUBLISHED" }))
		).toEqual({
			kind: "published",
			decidedBy: "José",
			decidedAt: "2026-10-09T11:00:00Z",
			reason: null,
		});
	});

	it("names who rejected a roster, when and why", () => {
		expect(
			scheduleDecision(generatedScheduleFixture({ status: "REJECTED" }))
		).toMatchObject({
			kind: "rejected",
			decidedBy: "José",
			reason: /supervisor/,
		});
	});

	it("keeps a decision whose decider left the company, unnamed", () => {
		expect(
			scheduleDecision(
				generatedScheduleFixture({
					status: "PUBLISHED",
					decidedBy: { membershipId: "m-c-1", displayName: null },
				})
			)
		).toMatchObject({ kind: "published", decidedBy: null });
	});
});
