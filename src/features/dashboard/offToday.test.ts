import { describe, expect, it } from "vitest";
import { dayOffFixture } from "@/features/dashboard/fixtures";
import { peopleOffOn } from "@/features/dashboard/offToday";
import { leaveFixture } from "@/features/leave/fixtures";

const TODAY = "2026-11-17";

describe("peopleOffOn", () => {
	it("counts each person on leave or rostered off that day once", () => {
		const onLeave = leaveFixture({
			leaveRequestId: "leave-aisha",
			membershipId: "ms-aisha",
			startDate: "2026-11-16",
			endDate: "2026-11-18",
		});
		const alsoRosteredOff = dayOffFixture({
			membershipId: "ms-aisha",
			day: TODAY,
		});
		const rosteredOff = dayOffFixture({ membershipId: "ms-kent", day: TODAY });

		expect(peopleOffOn(TODAY, [onLeave], [alsoRosteredOff, rosteredOff])).toBe(
			2
		);
	});

	it("leaves out leave and days off on other days", () => {
		const past = leaveFixture({
			leaveRequestId: "leave-past",
			startDate: "2026-11-10",
			endDate: "2026-11-12",
		});
		const tomorrow = dayOffFixture({ day: "2026-11-18" });

		expect(peopleOffOn(TODAY, [past], [tomorrow])).toBe(0);
	});
});
