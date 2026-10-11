import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { RosterShift } from "@/features/scheduling/RosterGrid";
import type { RosterShift as Shift } from "@/features/scheduling/schedules";

const shift: Shift = {
	shiftId: "s-1",
	date: "2026-04-16",
	start: "09:00",
	end: "18:00",
	role: "Front Desk",
	kind: "half",
	breakMinutes: 0,
	location: "Main Branch",
};

describe("RosterShift", () => {
	it("given_aShift_when_clicked_then_isNamedPressableAndReportsIt", async () => {
		const user = userEvent.setup();
		const onSelect = vi.fn();
		render(
			<RosterShift
				label="John Lim, Thu 09:00 – 18:00"
				selected={false}
				shift={shift}
				timeRange="09:00 – 18:00"
				onSelect={onSelect}
			/>
		);

		const button = screen.getByRole("button", {
			name: "John Lim, Thu 09:00 – 18:00",
		});
		expect(button).toHaveAttribute("aria-pressed", "false");
		expect(button).toHaveTextContent("09:00 – 18:00Front Desk");
		expect(button).toHaveClass("bg-warning-50");
		await user.click(button);
		expect(onSelect).toHaveBeenCalled();
	});
});
