import { describe, expect, it } from "vitest";
import {
	generatedScheduleFixture,
	scheduleFixture,
} from "@/features/scheduling/schedules/fixtures";
import {
	deletedScheduleLink,
	scheduleViewLink,
} from "@/features/scheduling/schedules/scheduleViewLink";

describe("scheduleViewLink", () => {
	it("reopens a draft at the wizard's Setup", () => {
		expect(scheduleViewLink(scheduleFixture())).toEqual({
			to: "/scheduling/new",
			search: { step: "setup", scheduleId: "s-1", departmentId: "d-1" },
		});
	});

	it.each(["GENERATION_REQUESTED", "GENERATED", "GENERATION_FAILED"] as const)(
		"opens a %s schedule's roster by its id alone",
		(status) => {
			expect(scheduleViewLink(generatedScheduleFixture({ status }))).toEqual({
				to: "/scheduling/$scheduleId",
				params: { scheduleId: "s-1" },
			});
		}
	);
});

describe("deletedScheduleLink", () => {
	it("opens a deleted schedule under History, never on the roster page", () => {
		expect(deletedScheduleLink("s-9")).toEqual({
			to: "/scheduling/history/$scheduleId",
			params: { scheduleId: "s-9" },
		});
	});
});
