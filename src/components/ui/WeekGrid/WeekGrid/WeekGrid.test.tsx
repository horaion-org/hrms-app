import { render, screen, within } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it } from "vitest";
import { WEEKDAYS } from "@/common/weekdays";
import {
	WeekGrid,
	type WeekGridDay,
	type WeekGridProps,
} from "@/components/ui/WeekGrid";
import { authTestI18n } from "@/features/auth/testingI18n";

const WEEK = "2026-11-09";

/** A week that is empty but for Wednesday's cell. */
const wednesdayOnly = (cell: string): Array<WeekGridDay> =>
	WEEKDAYS.map((day) => ({ day, cell: day === "WED" ? cell : "" }));

const show = (props: Partial<WeekGridProps> = {}): void => {
	render(
		<I18nextProvider i18n={authTestI18n}>
			<WeekGrid
				label="Your week"
				rows={[{ id: "me", days: wednesdayOnly("Morning") }]}
				weekStartMonday={WEEK}
				{...props}
			/>
		</I18nextProvider>
	);
};

const columnHeaders = (): Array<string | null> =>
	screen.getAllByRole("columnheader").map((header) => header.textContent);

describe("WeekGrid", () => {
	it("given_aWeek_when_shown_then_headsADayColumnWithEachDate", () => {
		show();

		expect(screen.getByRole("table", { name: "Your week" })).toBeVisible();
		expect(columnHeaders()).toEqual([
			"MonNov 9",
			"TueNov 10",
			"WedNov 11",
			"ThuNov 12",
			"FriNov 13",
			"SatNov 14",
			"SunNov 15",
		]);
	});

	it("given_aRowsCells_when_shown_then_putsEachUnderItsDay", () => {
		show();

		const cells = screen.getAllByRole("cell");
		expect(cells).toHaveLength(7);
		expect(cells[2]).toHaveTextContent("Morning");
		expect(cells[0]).toBeEmptyDOMElement();
	});

	it("given_headingsAndActions_when_shown_then_eachRowIsNamedAndKeepsItsActionCell", () => {
		show({
			headingLabel: "Member",
			actionsLabel: "Actions",
			rows: [
				{
					id: "a",
					heading: "Aisha Rahman",
					days: wednesdayOnly("Morning"),
					action: <button type="button">Edit</button>,
				},
				{ id: "f", heading: "Faris Ahmad", days: wednesdayOnly("Late") },
			],
		});

		expect(columnHeaders()[0]).toBe("Member");
		expect(columnHeaders()[8]).toBe("Actions");
		const [aisha, faris] = screen.getAllByRole("rowheader");
		expect(aisha).toHaveTextContent("Aisha Rahman");
		expect(faris).toHaveTextContent("Faris Ahmad");
		const farisRow = faris?.closest("tr");
		if (!farisRow) throw new Error("No row for Faris");
		expect(within(farisRow).getAllByRole("cell")).toHaveLength(8);
		expect(within(farisRow).queryByRole("button")).not.toBeInTheDocument();
	});

	it("given_aShownDay_when_shown_then_hidesEveryOtherDaysColumnBelowMd", () => {
		show({ shownDay: "2026-11-11" });

		const visible = (cells: Array<HTMLElement>): Array<HTMLElement> =>
			cells.filter((cell) => !cell.classList.contains("hidden"));
		const headers = screen.getAllByRole("columnheader");
		expect(visible(headers).map((header) => header.textContent)).toEqual([
			"WedNov 11",
		]);
		expect(headers[0]).toHaveClass("hidden", "md:table-cell");
		const cells = screen.getAllByRole("cell");
		expect(visible(cells)).toHaveLength(1);
		expect(visible(cells)[0]).toHaveTextContent("Morning");
		expect(screen.getByRole("table")).toHaveClass("md:min-w-182");
		expect(screen.getByRole("table")).not.toHaveClass("min-w-182");
	});

	it("given_noRows_when_shown_then_saysSoAcrossTheBody", () => {
		show({ rows: [], emptyState: "No members here." });

		const cell = screen.getByRole("cell");
		expect(cell).toHaveTextContent("No members here.");
		expect(cell).toHaveAttribute("colspan", "7");
	});
});
