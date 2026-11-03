import { render, screen, within } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it } from "vitest";
import { authTestI18n } from "@/features/auth/testingI18n";
import { byDay } from "@/features/availability/availabilityModel";
import { FIXTURE_WEEK } from "@/features/availability/fixtures";
import { WeekGrid, type WeekGridProps } from "@/features/availability/WeekGrid";

const show = (props: Partial<WeekGridProps> = {}): void => {
	render(
		<I18nextProvider i18n={authTestI18n}>
			<WeekGrid
				label="Your week"
				weekStartMonday={FIXTURE_WEEK}
				rows={[
					{
						id: "me",
						days: byDay([
							{ day: "WED", startTime: "18:00", endTime: "22:00" },
							{ day: "WED", startTime: "09:00", endTime: "13:00" },
						]),
					},
				]}
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

	it("given_windowsOnADay_when_shown_then_putsTheirChipsUnderThatDayEarliestFirst", () => {
		show();

		const cells = screen.getAllByRole("cell");
		expect(cells).toHaveLength(7);
		expect(cells[2]).toHaveTextContent("09:00–13:0018:00–22:00");
		expect(cells[0]).toHaveTextContent("Not available");
	});

	it("given_headingsAndActions_when_shown_then_eachRowIsNamedAndKeepsItsActionCell", () => {
		show({
			headingLabel: "Member",
			actionsLabel: "Actions",
			rows: [
				{
					id: "a",
					heading: "Aisha Rahman",
					days: byDay([]),
					action: <button type="button">Edit</button>,
				},
				{ id: "f", heading: "Faris Ahmad", days: byDay([]) },
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

	it("given_noRows_when_shown_then_saysSoAcrossTheBody", () => {
		show({ rows: [], emptyState: "No part-time members here." });

		expect(screen.getByRole("cell")).toHaveTextContent(
			"No part-time members here."
		);
	});
});
