import { describe, expect, it } from "vitest";
import { authTestI18n } from "@/features/auth/testingI18n";
import { availabilityFormSchema } from "@/features/availability/AvailabilityDialog/schema";
import type { WindowDraft } from "@/features/availability/availabilityModel";

const schema = availabilityFormSchema(authTestI18n.t.bind(authTestI18n));

const row = (
	days: WindowDraft["days"],
	startTime: string,
	endTime: string
): WindowDraft => ({ days, startTime, endTime });

describe("availability form validation", () => {
	it("given_twoSeparateWindowsOnOneDay_when_parsed_then_accepted", () => {
		expect(
			schema.safeParse({
				rows: [row(["MON"], "03:00", "05:00"), row(["MON"], "08:00", "10:00")],
			}).success
		).toBe(true);
	});

	it("given_anOvernightWindowAndALaterOneTheNextDay_when_parsed_then_accepted", () => {
		expect(
			schema.safeParse({
				rows: [row(["MON"], "22:00", "06:00"), row(["TUE"], "08:00", "10:00")],
			}).success
		).toBe(true);
	});

	it("given_aSundayOvernightRunningIntoMonday_when_parsed_then_namesTheSundayWindowNotMonday", () => {
		const result = schema.safeParse({
			rows: [
				row(["MON", "SUN"], "22:00", "04:00"),
				row(["MON"], "03:00", "05:00"),
				row(["MON"], "08:00", "10:00"),
			],
		});

		expect(
			result.error?.issues.map(({ path, message }) => ({ path, message }))
		).toEqual([
			{
				path: ["rows", 1],
				message: "This window overlaps Sunday 22:00–04:00.",
			},
		]);
	});

	it("given_anOvernightWindowRunningIntoTheNextDays_when_parsed_then_explainsTheOverlapOnItsRow", () => {
		const result = schema.safeParse({
			rows: [row(["MON"], "22:00", "06:00"), row(["TUE"], "05:00", "07:00")],
		});

		expect(result.success).toBe(false);
		expect(
			result.error?.issues.map(({ path, message }) => ({ path, message }))
		).toEqual([
			{
				path: ["rows", 1],
				message: "This window overlaps Monday 22:00–06:00.",
			},
		]);
	});
});
