import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ShiftDayAxis } from "@/features/scheduling/shifts/ShiftDayAxis";
import { ShiftDayBar } from "@/features/scheduling/shifts/ShiftDayBar";

/** 05:00 to 08:00 the next day. */
const AXIS = { startMinute: 300, endMinute: 1920 };

describe("ShiftDayAxis", () => {
	it("given_anAxis_when_drawn_then_labelsEveryThreeHoursAndIsNamedByItsLabel", () => {
		render(<ShiftDayAxis axis={AXIS} label="When it runs" />);

		expect(screen.getByText("When it runs")).toHaveClass("sr-only");
		expect(
			screen.getAllByText(/^\d\d$/).map((tick) => tick.textContent)
		).toEqual(["05", "08", "11", "14", "17", "20", "23", "02", "05", "08"]);
	});

	it("given_aWiderStep_when_drawn_then_labelsFewerHours", () => {
		render(<ShiftDayAxis axis={AXIS} label="When it runs" stepHours={6} />);

		expect(
			screen.getAllByText(/^\d\d$/).map((tick) => tick.textContent)
		).toEqual(["05", "11", "17", "23", "05"]);
	});

	it("given_theEndLabels_when_drawn_then_bothStayInsideTheAxis", () => {
		render(<ShiftDayAxis axis={AXIS} label="When it runs" />);

		const labels = screen.getAllByText(/^\d\d$/);
		expect(labels[0]).not.toHaveClass("-translate-x-1/2");
		expect(labels[labels.length - 1]).toHaveClass("-translate-x-full");
		expect(labels[1]).toHaveClass("-translate-x-1/2");
	});

	it("given_anAxisAndABarInOneContainer_when_drawn_then_anHoursLabelSitsAtTheBarsEdgeForThatHour", () => {
		render(
			<div>
				<ShiftDayAxis axis={AXIS} label="When it runs" />
				<ShiftDayBar
					axis={AXIS}
					shift={{ startTime: "08:00", endTime: "20:00" }}
				/>
			</div>
		);

		// One width: both fill the container, so equal percentages are equal places.
		expect(screen.getByTestId("shift-day-axis")).toHaveClass(
			"w-full",
			"min-w-32"
		);
		expect(screen.getByTestId("shift-day-track")).toHaveClass(
			"w-full",
			"min-w-32"
		);
		const axis = screen.getByTestId("shift-day-axis");
		const bar = screen.getByTestId("shift-day-bar");
		const [eight, twenty] = within(axis)
			.getAllByText(/^(08|20)$/)
			.slice(0, 2);
		expect(eight!.style.left).toBe(bar.style.left);
		const end =
			Number.parseFloat(bar.style.left) + Number.parseFloat(bar.style.width);
		expect(Number.parseFloat(twenty!.style.left)).toBeCloseTo(end);
	});
});
