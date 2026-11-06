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
import {
	carriedWeek,
	firstWeek,
	rosterOffCell,
} from "@/features/scheduling/startingContext/fixtures";
import { StartingDaysDialog } from "@/features/scheduling/startingContext/StartingDaysDialog";

const show = (
	onSave = vi.fn(),
	week = firstWeek(),
	openings?: OpeningBalances
): void => {
	render(
		<I18nextProvider i18n={authTestI18n}>
			<StartingDaysDialog
				open
				openings={openings}
				saving={false}
				week={week}
				onClose={vi.fn()}
				onSave={onSave}
			/>
		</I18nextProvider>
	);
};

describe("StartingDaysDialog", () => {
	it("given_aFirstWeek_when_shown_then_membersDownDaysAcrossWithLeaveLocked", () => {
		show();

		const table = screen.getByRole("table", { name: "The week before" });
		const tan = within(table).getByRole("row", { name: /Tan Wei Ming/ });
		expect(within(tan).getByText("On Leave")).toBeInTheDocument();
		expect(
			within(tan).queryByRole("button", { name: /Tan Wei Ming, Sat, Nov 7/ })
		).not.toBeInTheDocument();
		expect(
			within(tan).getByRole("button", { name: /Tan Wei Ming, Sun, Nov 8/ })
		).toHaveTextContent("Night 22:00 – 06:00");
	});

	it("given_aLockedDayOfAKindThisBuildDoesNotKnow_when_shown_then_readsUnknown", () => {
		const week = carriedWeek();
		week.members[0]!.cells[6] = {
			...rosterOffCell("2026-11-08"),
			kind: "UNKNOWN",
		};
		show(vi.fn(), week);

		const tan = within(
			screen.getByRole("table", { name: "The week before" })
		).getByRole("row", { name: /Tan Wei Ming/ });
		expect(within(tan).getByText("Unknown")).toBeInTheDocument();
	});

	it("given_sundayFilledWithADayOff_when_saved_then_onlyKnownDaysAreSent", async () => {
		const onSave = vi.fn();
		show(onSave);

		await userEvent.click(
			screen.getByRole("button", { name: "Fill empty days" })
		);
		await userEvent.click(screen.getByRole("button", { name: "Save days" }));

		expect(onSave).toHaveBeenCalledWith(
			[
				{
					memberProfileId: "p-tan",
					date: "2026-11-08",
					kind: "SHIFT",
					shiftId: "s-night",
				},
				{
					memberProfileId: "p-siti",
					date: "2026-11-08",
					kind: "OFF",
					shiftId: null,
				},
			],
			undefined
		);
	});

	it("given_aRosterStartingMidMonth_when_hoursTyped_then_theyAreSavedAsMinutesBesideTheDays", async () => {
		const onSave = vi.fn();
		show(
			onSave,
			firstWeek(),
			midMonthOpenings([
				editableMember("p-tan"),
				editableMember("p-siti", { editable: false, rosteredBefore: true }),
			])
		);

		const table = screen.getByRole("table", { name: "The week before" });
		const siti = within(table).getByRole("row", { name: /Siti/ });
		expect(within(siti).getAllByText("From rosters")).toHaveLength(2);
		await userEvent.type(
			screen.getByRole("spinbutton", { name: /Tan Wei Ming, paid hours worked/ }),
			"72"
		);
		await userEvent.type(
			screen.getByRole("spinbutton", { name: /Tan Wei Ming, overtime/ }),
			"28"
		);
		await userEvent.click(screen.getByRole("button", { name: "Save days" }));

		expect(onSave).toHaveBeenCalledWith(expect.any(Array), [
			{ memberProfileId: "p-tan", workedMinutes: 4320, overtimeMinutes: 1680 },
		]);
	});

	it("given_overtimeAboveTheHoursWorked_when_typed_then_saveIsHeldWithAReason", async () => {
		show(vi.fn(), firstWeek(), midMonthOpenings([editableMember("p-tan")]));

		await userEvent.type(
			screen.getByRole("spinbutton", { name: /Tan Wei Ming, overtime/ }),
			"28"
		);

		expect(
			screen.getByText(
				"Overtime is part of the hours worked, so it can’t be more than them."
			)
		).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Save days" })).toBeDisabled();
	});

	it("given_openingsThatArriveAfterTheDialogOpened_when_shownAndSavedUntouched_then_theyShowAndNothingIsSent", async () => {
		const onSave = vi.fn();
		const dialog = (openings?: OpeningBalances): ReactElement => (
			<I18nextProvider i18n={authTestI18n}>
				<StartingDaysDialog
					open
					openings={openings}
					saving={false}
					week={firstWeek()}
					onClose={vi.fn()}
					onSave={onSave}
				/>
			</I18nextProvider>
		);
		const { rerender } = render(dialog());

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

		expect(
			screen.getByRole("spinbutton", { name: /Tan Wei Ming, paid hours worked/ })
		).toHaveValue(72);
		await userEvent.click(screen.getByRole("button", { name: "Save days" }));
		expect(onSave).toHaveBeenCalledWith(expect.any(Array), undefined);
	});

	it("given_anOpeningEnteredHere_when_bothCellsAreEmptied_then_itIsSentAsAClear", async () => {
		const onSave = vi.fn();
		show(
			onSave,
			firstWeek(),
			midMonthOpenings([
				editableMember("p-tan", {
					workedMinutes: 4320,
					overtimeMinutes: 1680,
					enteredAsOf: "2026-11-09",
				}),
			])
		);

		await userEvent.clear(
			screen.getByRole("spinbutton", { name: /Tan Wei Ming, paid hours worked/ })
		);
		await userEvent.clear(
			screen.getByRole("spinbutton", { name: /Tan Wei Ming, overtime/ })
		);
		await userEvent.click(screen.getByRole("button", { name: "Save days" }));

		expect(onSave).toHaveBeenCalledWith(expect.any(Array), [
			{ memberProfileId: "p-tan", workedMinutes: null, overtimeMinutes: null },
		]);
	});
});
