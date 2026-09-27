import { render, screen } from "@testing-library/react";
import { composeStories } from "@storybook/react-vite";
import { expect, it } from "vitest";
import * as stories from "@/components/forms/Calendar/CalendarMonthView/CalendarMonthView.stories";

const { Default, Spanish } = composeStories(stories);
it.each([
	{ Story: Default, selected: "June", text: "Jun" },
	{ Story: Spanish, selected: "junio", text: "jun" },
])(
	"renders the month story with $selected selected",
	({ Story, selected, text }) => {
		render(<Story />);
		expect(
			screen.getByRole("grid", { name: "Leave date" })
		).toBeInTheDocument();
		expect(screen.getAllByRole("row")).toHaveLength(3);
		expect(screen.getAllByRole("gridcell")).toHaveLength(12);
		expect(
			screen.getByRole("gridcell", { name: selected, selected: true })
		).toHaveTextContent(text);
	}
);
