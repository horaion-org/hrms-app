import { describe, expect, it } from "vitest";
import { leaveRequestSchema } from "@/features/leave/api";
import { leaveFixture } from "@/features/leave/fixtures";

describe("leaveRequestSchema", () => {
	it("accepts a leave type code the app has never seen", () => {
		const parsed = leaveRequestSchema.parse(
			leaveFixture({ leaveRequestId: "r-1", leaveType: "STUDY_LEAVE" })
		);
		expect(parsed.leaveType).toBe("STUDY_LEAVE");
	});

	it("reads a request from an API older than the leave type catalogue", () => {
		const older: Record<string, unknown> = {
			...leaveFixture({ leaveRequestId: "r-2" }),
		};
		delete older["leaveTypeId"];
		delete older["leaveTypeName"];
		const parsed = leaveRequestSchema.parse(older);
		expect(parsed.leaveTypeId).toBeNull();
		expect(parsed.leaveTypeName).toBeNull();
	});
});
