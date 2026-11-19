import { render, screen, within } from "@testing-library/react";
import type { ReactElement } from "react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it, vi } from "vitest";
import { authTestI18n } from "@/features/auth/testingI18n";
import type { OpeningBalances } from "@/features/scheduling/hours/api";
import {
	editableMember,
	midMonthOpenings,
} from "@/features/scheduling/hours/fixtures";
import { OpeningHoursDialog } from "@/features/scheduling/hours/OpeningHoursDialog";
import { firstWeek } from "@/features/scheduling/startingContext/fixtures";

const PEOPLE = firstWeek().members;

const dialog = (
	openings: OpeningBalances,
	{
		onSave = vi.fn(),
		onClose = vi.fn(),
		generated = false,
	}: {
		onSave?: () => void;
		onClose?: () => void;
		generated?: boolean;
	} = {}
): ReactElement => (
	<I18nextProvider i18n={authTestI18n}>
		<OpeningHoursDialog
			open
			generated={generated}
			openings={openings}
			people={PEOPLE}
			saving={false}
			onClose={onClose}
			onSave={onSave}
		/>
	</I18nextProvider>
);

const workedCell = (): HTMLElement =>
	screen.getByRole("spinbutton", { name: /Tan Wei Ming, paid hours worked/ });
const overtimeCell = (): HTMLElement =>
	screen.getByRole("spinbutton", { name: /Tan Wei Ming, overtime/ });

describe("OpeningHoursDialog", () => {
	it("given_aRosterStartingMidMonth_when_shown_then_theTitleNamesTheDaysAndTheUnknownAreCounted", () => {
		render(dialog(midMonthOpenings([editableMember("p-tan")])));

		expect(
			screen.getByRole("dialog", {
				name: "Hours already worked this month (Nov 1 to Nov 8)",
			})
		).toBeVisible();
		expect(
			screen.getByText("Hours worked before Nov 9 are unknown for 1 person.")
		).toBeVisible();
		expect(
			screen.queryByText(/Regenerate the month to use them/)
		).not.toBeInTheDocument();
	});

	it("given_aWeekWithARoster_when_shown_then_saysRegeneratingUsesTheHours", () => {
		render(
			dialog(midMonthOpenings([editableMember("p-tan")]), { generated: true })
		);

		expect(
			screen.getByText(
				"Changing these hours doesn’t change a roster already generated. Regenerate the month to use them."
			)
		).toBeVisible();
	});

	it("given_hoursTyped_when_saved_then_onlyTheChangedPersonIsSentInMinutes", async () => {
		const onSave = vi.fn();
		render(
			dialog(
				midMonthOpenings([
					editableMember("p-tan"),
					editableMember("p-siti", { editable: false, rosteredBefore: true }),
				]),
				{ onSave }
			)
		);

		const table = screen.getByRole("table", {
			name: "Hours worked this month before Nov 9",
		});
		const siti = within(table).getByRole("row", { name: /Siti/ });
		expect(within(siti).getAllByText("From rosters")).toHaveLength(2);
		await userEvent.type(workedCell(), "72");
		await userEvent.type(overtimeCell(), "28");
		await userEvent.click(screen.getByRole("button", { name: "Save hours" }));

		expect(onSave).toHaveBeenCalledWith([
			{ memberProfileId: "p-tan", workedMinutes: 4320, overtimeMinutes: 1680 },
		]);
	});

	it("given_nothingChanged_when_saved_then_itClosesWithoutSaving", async () => {
		const onSave = vi.fn();
		const onClose = vi.fn();
		render(
			dialog(midMonthOpenings([editableMember("p-tan")]), { onSave, onClose })
		);

		await userEvent.click(screen.getByRole("button", { name: "Save hours" }));

		expect(onSave).not.toHaveBeenCalled();
		expect(onClose).toHaveBeenCalled();
	});

	it("given_overtimeAboveTheHoursWorked_when_typed_then_saveIsHeldWithAReason", async () => {
		render(dialog(midMonthOpenings([editableMember("p-tan")])));

		await userEvent.type(overtimeCell(), "28");

		expect(
			screen.getByText(
				"Overtime is part of the hours worked, so it can’t be more than them."
			)
		).toBeVisible();
		expect(screen.getByRole("button", { name: "Save hours" })).toBeDisabled();
	});

	it("given_moreHoursThanTheDaysHold_when_typed_then_theReasonNamesTheDay", async () => {
		render(dialog(midMonthOpenings([editableMember("p-tan")])));

		await userEvent.type(workedCell(), "500");

		expect(
			screen.getByText(
				"That’s more hours than the days of the month before Nov 9 hold."
			)
		).toBeVisible();
	});

	it("given_openingsThatChangeAfterOpening_when_shown_then_theNewFiguresShow", () => {
		const { rerender } = render(
			dialog(midMonthOpenings([editableMember("p-tan")]))
		);

		rerender(
			dialog(
				midMonthOpenings([
					editableMember("p-tan", {
						workedMinutes: 4320,
						overtimeMinutes: 1680,
						enteredAsOf: "2026-11-09",
					}),
				])
			)
		);

		expect(workedCell()).toHaveValue(72);
		expect(screen.queryByText(/are unknown for/)).not.toBeInTheDocument();
	});

	it("given_anOpeningEnteredHere_when_bothCellsAreEmptied_then_itIsSentAsAClear", async () => {
		const onSave = vi.fn();
		render(
			dialog(
				midMonthOpenings([
					editableMember("p-tan", {
						workedMinutes: 4320,
						overtimeMinutes: 1680,
						enteredAsOf: "2026-11-09",
					}),
				]),
				{ onSave }
			)
		);

		await userEvent.clear(workedCell());
		await userEvent.clear(overtimeCell());
		await userEvent.click(screen.getByRole("button", { name: "Save hours" }));

		expect(onSave).toHaveBeenCalledWith([
			{ memberProfileId: "p-tan", workedMinutes: null, overtimeMinutes: null },
		]);
	});

	it("given_lockedOpenings_when_shown_then_figuresOrNoneEnteredShowWithTheirTextAsTitle", () => {
		render(
			dialog(
				midMonthOpenings([
					editableMember("p-tan", {
						editable: false,
						workedMinutes: 450,
						overtimeMinutes: 0,
						enteredAsOf: "2026-11-02",
					}),
					editableMember("p-siti", { editable: false }),
				])
			)
		);

		expect(screen.getByText("7.5 h")).toHaveAttribute("title", "7.5 h");
		expect(screen.getAllByText("None entered")).toHaveLength(2);
	});
});
