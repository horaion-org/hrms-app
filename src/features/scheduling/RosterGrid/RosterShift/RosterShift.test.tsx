import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { RosterShift } from "@/features/scheduling/RosterGrid";
import type { RosterShiftCell } from "@/features/scheduling/roster/roster";

const assignment: RosterShiftCell = {
	kind: "shift",
	assignmentId: "a-1",
	shiftId: "front-desk-am-copy",
	name: "Front Desk AM",
	group: "Front Desk",
	colour: "#E9A55A",
	start: "09:00",
	end: "15:00",
	role: "Front Desk Lead",
};

describe("RosterShift", () => {
	it("given_aGeneratedShift_when_rendered_then_isNamedAndColouredByItsShift", async () => {
		const user = userEvent.setup();
		const onSelect = vi.fn();
		render(
			<RosterShift
				selected
				label="Aisha Rahman, Mon 09:00 – 15:00"
				shift={assignment}
				timeRange="09:00 – 15:00"
				onSelect={onSelect}
			/>
		);

		const button = screen.getByRole("button", {
			name: "Aisha Rahman, Mon 09:00 – 15:00",
		});
		expect(button).toHaveAttribute("aria-pressed", "true");
		expect(button).toHaveTextContent(
			"Front Desk AMFront Desk Lead09:00 – 15:00"
		);
		expect(button).toHaveStyle({
			borderColor: "#E9A55A",
			backgroundColor: "rgb(252, 242, 230)",
		});
		await user.click(button);
		expect(onSelect).toHaveBeenCalled();
	});
});
