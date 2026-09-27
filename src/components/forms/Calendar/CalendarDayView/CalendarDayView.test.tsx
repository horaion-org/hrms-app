import { render, screen } from "@testing-library/react";
import { composeStories } from "@storybook/react-vite";
import { expect, it } from "vitest";
import { CalendarDayView } from "@/components/forms/Calendar/CalendarDayView";
import * as stories from "@/components/forms/Calendar/CalendarDayView/CalendarDayView.stories";

it("renders the day view story", () => {
	const { Default } = composeStories(stories);
	render(<Default />);
	expect(screen.getByRole("grid", { name: "Leave date" })).toBeInTheDocument();
});

it("renders the named grid and selection supplied by its parent", () => {
	render(
		<CalendarDayView
			aria-label="Leave date"
			language="en"
			month="2026-06-01"
			selectedDate="2026-06-10"
			today="2026-06-15"
		/>
	);
	expect(screen.getByRole("grid", { name: "Leave date" })).toBeInTheDocument();
	expect(
		screen.getByRole("gridcell", {
			name: "Wednesday, 10 June 2026",
			selected: true,
		})
	).toHaveTextContent("10");
	expect(
		screen.getByRole("columnheader", { name: "Monday" })
	).toHaveTextContent("Mon");
});
