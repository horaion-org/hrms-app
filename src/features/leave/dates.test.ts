import { expect, it } from "vitest";
import { rangeDays, shiftRange } from "@/features/leave/dates";

it("navigates inclusive periods across a year boundary without gaps", () => {
	const range = { start: "2026-12-20", end: "2027-01-02" };
	expect(rangeDays(range)).toHaveLength(14);
	const next = shiftRange(range, 1);
	expect(next).toEqual({ start: "2027-01-03", end: "2027-01-16" });
	expect(shiftRange(next, -1)).toEqual(range);
});
