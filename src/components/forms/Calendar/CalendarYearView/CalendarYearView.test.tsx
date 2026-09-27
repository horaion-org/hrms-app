import { render, screen } from "@testing-library/react";
import { composeStories } from "@storybook/react-vite";
import { expect, it } from "vitest";
import * as stories from "@/components/forms/Calendar/CalendarYearView/CalendarYearView.stories";

it("renders the year story with the supplied selection", () => {
	const { Default } = composeStories(stories);
	render(<Default />);
	expect(screen.getByRole("grid", { name: "Leave date" })).toBeInTheDocument();
	expect(screen.getAllByRole("row")).toHaveLength(3);
	expect(screen.getAllByRole("gridcell")).toHaveLength(12);
	expect(
		screen.getByRole("gridcell", { name: "2026", selected: true })
	).toHaveTextContent("2026");
});
