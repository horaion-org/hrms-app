import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Chip } from "@/components/ui/Chip";

describe("Chip", () => {
	it("given_aLabel_when_shown_then_readsItAsGiven", () => {
		render(<Chip label="22:00–06:00" />);

		expect(screen.getByText("22:00–06:00")).toBeVisible();
	});

	it("given_aLabelLongerThanItsCell_when_shown_then_keepsToOneLine", () => {
		render(<Chip label="Front Desk Afternoon" />);

		expect(screen.getByText("Front Desk Afternoon")).toHaveClass(
			"block",
			"truncate"
		);
	});
});
