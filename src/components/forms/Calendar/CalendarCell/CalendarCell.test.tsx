import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { composeStories } from "@storybook/react-vite";
import { describe, expect, it, vi } from "vitest";
import { CalendarCell } from "@/components/forms/Calendar/CalendarCell";
import * as stories from "@/components/forms/Calendar/CalendarCell/CalendarCell.stories";

describe("CalendarCell", () => {
	it.each(Object.entries(composeStories(stories)))(
		"renders the %s story",
		(_, Story) => {
			render(<Story />);
			expect(screen.getByRole("gridcell")).toBeInTheDocument();
		}
	);
	it("exposes selected and today states with a full accessible label", () => {
		render(
			<CalendarCell
				selected
				today
				aria-label="Wednesday, 10 June 2026"
				className="custom-cell"
			>
				10
			</CalendarCell>
		);
		const cell = screen.getByRole("gridcell", {
			name: "Wednesday, 10 June 2026",
			selected: true,
		});
		expect(cell).toHaveAttribute("aria-current", "date");
		expect(cell).toHaveClass(
			"bg-ink-blue-900",
			"text-white",
			"underline",
			"custom-cell"
		);
		expect(cell).toHaveTextContent("10");
	});

	it("keeps disabled cells readable and focusable but prevents selection", async () => {
		const onClick = vi.fn();
		render(
			<CalendarCell disabled selected weekend onClick={onClick}>
				10
			</CalendarCell>
		);
		const cell = screen.getByRole("gridcell");
		expect(cell).toHaveAttribute("aria-disabled", "true");
		expect(cell).toHaveClass("text-neutral-400");
		expect(cell).not.toHaveClass(
			"bg-ink-blue-900",
			"text-white",
			"text-ink-blue-500",
			"hover:bg-porcelain-50"
		);
		await userEvent.tab();
		expect(cell).toHaveFocus();
		await userEvent.keyboard("{Enter}");
		await userEvent.click(cell);
		expect(onClick).not.toHaveBeenCalled();
	});
});
