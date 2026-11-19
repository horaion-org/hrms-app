import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ShiftDayBar } from "@/features/scheduling/shifts/ShiftDayBar";

describe("ShiftDayBar", () => {
	it("given_aShiftOnAnAxis_when_drawn_then_theBarSitsAtItsShareAndIsHiddenFromAssistiveTechnology", () => {
		const { container } = render(
			<ShiftDayBar
				axis={{ startMinute: 360, endMinute: 1080 }}
				shift={{ startTime: "09:00", endTime: "15:00" }}
			/>
		);

		const bar = screen.getByTestId("shift-day-bar");
		expect(bar.style.left).toBe("25%");
		expect(bar.style.width).toBe("50%");
		expect(container.firstChild).toHaveAttribute("aria-hidden", "true");
		expect(container.firstChild).toHaveClass("w-full");
	});
});
