import { describe, expect, it } from "vitest";
import { newSinceReview } from "@/features/organisation/newPermissions";

describe("permissions new to a role since it was last saved", () => {
	it("are the keys whose day is after the save's day, that the role lacks", () => {
		expect(
			newSinceReview(["schedule:read"], "2026-11-15T23:00:00Z", "LOCAL")
		).toEqual([
			"shift_preference:read",
			"shift_preference:update",
			"member_event:read",
			"report:read",
		]);
		expect(
			newSinceReview(
				["shift_preference:read", "report:read"],
				"2026-11-15T23:00:00Z",
				"LOCAL"
			)
		).toEqual(["shift_preference:update", "member_event:read"]);
	});

	it("leave out a key that arrived on the day of the save", () => {
		expect(newSinceReview([], "2026-11-17T00:30:00Z", "COMPANY")).toEqual([]);
	});

	it("leave out keys a local role may not hold", () => {
		const company = newSinceReview([], "2026-11-04T09:00:00Z", "COMPANY");
		const local = newSinceReview([], "2026-11-04T09:00:00Z", "LOCAL");
		expect(company).toContain("leave_type:read");
		expect(local).not.toContain("leave_type:read");
		expect(local).toContain("leave_duration:read");
	});

	it("never list a key only the System Owner and System Admin roles hold, however new", () => {
		expect(newSinceReview([], "2026-11-16T09:00:00Z", "COMPANY")).not.toContain(
			"access_role:assign_system_admin"
		);
	});

	it("are none without a review time", () => {
		expect(newSinceReview([], null, "COMPANY")).toEqual([]);
		expect(newSinceReview([], undefined, "COMPANY")).toEqual([]);
	});
});
