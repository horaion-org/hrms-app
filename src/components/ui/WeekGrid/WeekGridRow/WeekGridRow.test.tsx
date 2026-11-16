import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { WEEKDAYS } from "@/common/weekdays";
import {
	WeekGridRow,
	type WeekGridDay,
	type WeekGridRowProps,
} from "@/components/ui/WeekGrid/WeekGridRow";

/** A week whose every cell reads its own weekday. */
const DAYS: Array<WeekGridDay> = WEEKDAYS.map((day) => ({ day, cell: day }));

const show = (props: Partial<WeekGridRowProps> = {}): void => {
	render(
		<table>
			<tbody>
				<WeekGridRow days={DAYS} {...props} />
			</tbody>
		</table>
	);
};

describe("WeekGridRow", () => {
	it("given_onlyDays_when_shown_then_drawsSevenCellsMondayFirst", () => {
		show();

		const cells = screen.getAllByRole("cell");
		expect(cells.map((cell) => cell.textContent)).toEqual([...WEEKDAYS]);
		expect(screen.queryByRole("rowheader")).not.toBeInTheDocument();
	});

	it("given_aHeadingAndAnAction_when_shown_then_namesTheRowAndEndsWithTheAction", () => {
		show({
			withHeading: true,
			heading: "Cheryl Ng",
			withActions: true,
			action: <button type="button">Edit</button>,
		});

		expect(screen.getByRole("rowheader")).toHaveTextContent("Cheryl Ng");
		const cells = screen.getAllByRole("cell");
		expect(cells).toHaveLength(8);
		expect(cells[7]).toContainElement(screen.getByRole("button"));
	});

	it("given_anActionsColumnAndNoAction_when_shown_then_keepsTheEmptyCell", () => {
		show({ withActions: true });

		const cells = screen.getAllByRole("cell");
		expect(cells).toHaveLength(8);
		expect(cells[7]).toBeEmptyDOMElement();
	});

	it("given_aShownWeekday_when_shown_then_hidesEveryOtherDayBelowMd", () => {
		show({ shownWeekday: "WED" });

		const visible = screen
			.getAllByRole("cell")
			.filter((cell) => !cell.classList.contains("hidden"));
		expect(visible.map((cell) => cell.textContent)).toEqual(["WED"]);
	});
});
