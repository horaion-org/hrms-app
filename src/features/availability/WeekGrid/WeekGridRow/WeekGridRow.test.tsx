import { render, screen } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it } from "vitest";
import { authTestI18n } from "@/features/auth/testingI18n";
import { byDay } from "@/features/availability/availabilityModel";
import {
	WeekGridRow,
	type WeekGridRowProps,
} from "@/features/availability/WeekGrid/WeekGridRow";

const show = (props: Partial<WeekGridRowProps> = {}): void => {
	render(
		<I18nextProvider i18n={authTestI18n}>
			<table>
				<tbody>
					<WeekGridRow
						days={byDay([{ day: "SUN", startTime: "22:00", endTime: "06:00" }])}
						{...props}
					/>
				</tbody>
			</table>
		</I18nextProvider>
	);
};

describe("WeekGridRow", () => {
	it("given_onlyDays_when_shown_then_drawsSevenCellsMondayFirst", () => {
		show();

		const cells = screen.getAllByRole("cell");
		expect(cells).toHaveLength(7);
		expect(cells[6]).toHaveTextContent("22:00–06:00");
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
});
