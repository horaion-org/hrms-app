import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { WindowChip } from "@/features/availability/WeekGrid/WindowChip";

describe("WindowChip", () => {
	it("given_aWindowPastMidnight_when_shown_then_readsStartToEnd", () => {
		render(<WindowChip window={{ startTime: "22:00", endTime: "06:00" }} />);

		expect(screen.getByText("22:00–06:00")).toBeVisible();
	});
});
