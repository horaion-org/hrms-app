import { describe, expect, it } from "vitest";
import {
	KITCHEN_REACH,
	LEAVE_DURATION_CATALOGUE_FIXTURE,
	managedLeaveDurationFixture,
} from "@/features/leaveDurations/fixtures";
import {
	movedOrder,
	statusToggleBody,
} from "@/features/leaveDurations/leaveDurationCatalogue";

describe("movedOrder", () => {
	it("sends the whole list with the duration moved one place", () => {
		expect(
			movedOrder(LEAVE_DURATION_CATALOGUE_FIXTURE, "ld-night", "up")
		).toEqual({ leaveDurationIds: ["ld-morning", "ld-night", "ld-prep"] });
		expect(
			movedOrder(LEAVE_DURATION_CATALOGUE_FIXTURE, "ld-morning", "down")
		).toEqual({ leaveDurationIds: ["ld-prep", "ld-morning", "ld-night"] });
	});

	it("reads the list in its company order, whatever order it arrives in", () => {
		expect(
			movedOrder(
				[...LEAVE_DURATION_CATALOGUE_FIXTURE].reverse(),
				"ld-prep",
				"down"
			)
		).toEqual({ leaveDurationIds: ["ld-morning", "ld-night", "ld-prep"] });
	});

	it("moves nothing past either end, nor a duration not in the list", () => {
		expect(
			movedOrder(LEAVE_DURATION_CATALOGUE_FIXTURE, "ld-morning", "up")
		).toBeNull();
		expect(
			movedOrder(LEAVE_DURATION_CATALOGUE_FIXTURE, "ld-night", "down")
		).toBeNull();
		expect(
			movedOrder(LEAVE_DURATION_CATALOGUE_FIXTURE, "ld-gone", "up")
		).toBeNull();
	});
});

describe("statusToggleBody", () => {
	it("switches an active duration off, sending its times and reach back", () => {
		expect(
			statusToggleBody(
				managedLeaveDurationFixture({ appliesToDepartments: [KITCHEN_REACH] })
			)
		).toEqual({
			name: "Morning",
			startTime: "09:00",
			endTime: "13:00",
			appliesToBranchIds: [],
			appliesToDepartmentIds: ["d-kitchen"],
			status: "INACTIVE",
		});
	});

	it("switches an inactive duration on", () => {
		expect(
			statusToggleBody(managedLeaveDurationFixture({ status: "INACTIVE" }))
				.status
		).toBe("ACTIVE");
	});
});
