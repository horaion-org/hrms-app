import { render, screen } from "@testing-library/react";
import { composeStories } from "@storybook/react-vite";
import { expect, it, vi } from "vitest";
import { CalendarHeader } from "@/components/forms/Calendar/CalendarHeader";
import * as stories from "@/components/forms/Calendar/CalendarHeader/CalendarHeader.stories";

const { Default, Months, Years } = composeStories(stories);
it.each([
	{
		Story: Default,
		title: "June 2026",
		action: "Show months",
		disabled: false,
	},
	{ Story: Months, title: "2026", action: "Show years", disabled: false },
	{ Story: Years, title: "2015 - 2026", action: "2015 - 2026", disabled: true },
])("renders the $title header story", ({ Story, title, action, disabled }) => {
	render(<Story />);
	expect(screen.getByText(title)).toHaveAttribute("aria-live", "polite");
	const button = screen.getByRole("button", { name: action });
	if (disabled) expect(button).toBeDisabled();
	else expect(button).toBeEnabled();
});

it("renders the live title and named icon actions", () => {
	render(
		<CalendarHeader
			nextLabel="Next month"
			previousLabel="Previous month"
			title="June 2026"
			onNext={vi.fn()}
			onPrevious={vi.fn()}
		/>
	);
	expect(screen.getByText("June 2026")).toHaveAttribute("aria-live", "polite");
	expect(screen.getByRole("button", { name: "Previous month" })).toHaveClass(
		"size-9"
	);
	expect(screen.getByRole("button", { name: "Next month" })).toHaveClass(
		"size-9"
	);
});
