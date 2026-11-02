import { describe, expect, it } from "vitest";
import {
	generatedScheduleFixture,
	scheduleFixture,
} from "@/features/scheduling/schedules/fixtures";
import { scheduleViewLink } from "@/features/scheduling/schedules/scheduleViewLink";

describe("scheduleViewLink", () => {
	it("reopens a draft at the wizard's Setup", () => {
		expect(scheduleViewLink(scheduleFixture())).toEqual({
			to: "/scheduling/new",
			search: { step: "setup", scheduleId: "s-1", departmentId: "d-1" },
		});
	});

	it.each(["GENERATION_REQUESTED", "GENERATED", "GENERATION_FAILED"] as const)(
		"opens a %s schedule's roster at its department",
		(status) => {
			expect(scheduleViewLink(generatedScheduleFixture({ status }))).toEqual({
				to: "/scheduling/$scheduleId",
				params: { scheduleId: "s-1" },
				search: { branchId: "b-1", departmentId: "d-1" },
			});
		}
	);
});
