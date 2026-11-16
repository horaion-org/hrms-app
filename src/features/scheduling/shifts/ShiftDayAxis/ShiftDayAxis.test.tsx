import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ShiftDayAxis } from "@/features/scheduling/shifts/ShiftDayAxis";

describe("ShiftDayAxis", () => {
	it("given_anAxis_when_drawn_then_labelsEveryThreeHoursAndIsNamedByItsLabel", () => {
		render(
			<ShiftDayAxis
				axis={{ startMinute: 300, endMinute: 1920 }}
				label="When it runs"
			/>
		);

		expect(screen.getByText("When it runs")).toHaveClass("sr-only");
		expect(
			screen
				.getAllByText(/^\d\d$/)
				.map((tick) => tick.textContent)
		).toEqual(["05", "08", "11", "14", "17", "20", "23", "02", "05", "08"]);
	});
});
