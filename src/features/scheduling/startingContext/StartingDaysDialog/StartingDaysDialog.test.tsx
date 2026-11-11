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
import type { StartingDays } from "@/features/scheduling/startingContext/api";
import {
	carriedWeek,
	earlierDayTypedWeek,
	firstWeek,
	WEEK_BEFORE,
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

/** The answer of an API that still sends only the 7 days. */
const onlyTheNearerWeek = (): StartingDays => {
	const week = firstWeek();
	return {
		...week,
		days: WEEK_BEFORE,
		members: week.members.map((member) => ({
			...member,
			cells: member.cells.filter((cell) => WEEK_BEFORE.includes(cell.date)),
		})),
	};
};

describe("StartingDaysDialog", () => {
	it("given_aFirstWeek_when_shown_then_membersDownDaysAcrossWithLeaveLocked", () => {
		show();

		const table = screen.getByRole("table", {
			name: "The days before this week",
		});
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
		week.members[0]!.cells = week.members[0]!.cells.map((cell) =>
			cell.date === "2026-11-08" ? { ...cell, kind: "UNKNOWN" } : cell
		);
		show(vi.fn(), week);

		const tan = within(
			screen.getByRole("table", { name: "The days before this week" })
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

		const table = screen.getByRole("table", {
			name: "The days before this week",
		});
		const siti = within(table).getByRole("row", { name: /Siti/ });
		expect(within(siti).getAllByText("From rosters")).toHaveLength(2);
		await userEvent.type(
			screen.getByRole("spinbutton", {
				name: /Tan Wei Ming, paid hours worked/,
			}),
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
			screen.getByRole("spinbutton", {
				name: /Tan Wei Ming, paid hours worked/,
			})
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
			screen.getByRole("spinbutton", {
				name: /Tan Wei Ming, paid hours worked/,
			})
		);
		await userEvent.clear(
			screen.getByRole("spinbutton", { name: /Tan Wei Ming, overtime/ })
		);
		await userEvent.click(screen.getByRole("button", { name: "Save days" }));

		expect(onSave).toHaveBeenCalledWith(expect.any(Array), [
			{ memberProfileId: "p-tan", workedMinutes: null, overtimeMinutes: null },
		]);
	});
	it("given_fourteenDays_when_opened_then_onlyTheNearerWeekIsShown", () => {
		show();

		const table = screen.getByRole("table", {
			name: "The days before this week",
		});
		expect(
			within(table).getByRole("columnheader", { name: "Mon, Nov 2" })
		).toBeInTheDocument();
		expect(
			within(table).queryByRole("columnheader", { name: "Sun, Nov 1" })
		).not.toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Show 7 earlier days" })
		).toHaveAttribute("aria-expanded", "false");
	});

	it("given_theNearerWeek_when_showEarlierClicked_then_fourteenColumnsAndDayToFillListsThem", async () => {
		const user = userEvent.setup();
		show();

		await user.click(
			screen.getByRole("button", { name: "Show 7 earlier days" })
		);

		const table = screen.getByRole("table", {
			name: "The days before this week",
		});
		expect(
			within(table).getByRole("columnheader", { name: "Mon, Oct 26" })
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Hide earlier days" })
		).toHaveAttribute("aria-expanded", "true");
		await user.click(screen.getByRole("button", { name: "Day to fill" }));
		expect(screen.getByRole("option", { name: "Mon, Oct 26" })).toBeVisible();
	});

	it("given_anEnteredEarlierDay_when_opened_then_theEarlierWeekIsShown", () => {
		show(vi.fn(), earlierDayTypedWeek());

		expect(
			within(
				screen.getByRole("table", { name: "The days before this week" })
			).getByRole("columnheader", { name: "Fri, Oct 30" })
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Hide earlier days" })
		).toBeInTheDocument();
	});

	it("given_earlierDaysEntered_when_hiddenAndSaved_then_theyAreStillSent", async () => {
		const user = userEvent.setup();
		const onSave = vi.fn();
		show(onSave, earlierDayTypedWeek());

		await user.click(screen.getByRole("button", { name: "Hide earlier days" }));
		await user.click(screen.getByRole("button", { name: "Save days" }));

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
					date: "2026-10-30",
					kind: "OFF",
					shiftId: null,
				},
			],
			undefined
		);
	});

	it("given_dayToFillInTheEarlierWeek_when_hidden_then_dayToFillIsSunday", async () => {
		const user = userEvent.setup();
		show();

		await user.click(
			screen.getByRole("button", { name: "Show 7 earlier days" })
		);
		await user.click(screen.getByRole("button", { name: "Day to fill" }));
		await user.click(screen.getByRole("option", { name: "Mon, Oct 26" }));
		await user.click(screen.getByRole("button", { name: "Hide earlier days" }));

		expect(
			screen.getByRole("button", { name: "Day to fill" })
		).toHaveTextContent("Sun, Nov 8");
	});

	it("given_fillEmptyOnAnEarlierDay_when_clicked_then_onlyThatDaysEmptyCellsAreFilled", async () => {
		const user = userEvent.setup();
		const onSave = vi.fn();
		show(onSave);

		await user.click(
			screen.getByRole("button", { name: "Show 7 earlier days" })
		);
		await user.click(screen.getByRole("button", { name: "Day to fill" }));
		await user.click(screen.getByRole("option", { name: "Mon, Oct 26" }));
		await user.click(screen.getByRole("button", { name: "Fill empty days" }));
		await user.click(screen.getByRole("button", { name: "Save days" }));

		expect(onSave).toHaveBeenCalledWith(
			[
				{
					memberProfileId: "p-tan",
					date: "2026-10-26",
					kind: "OFF",
					shiftId: null,
				},
				{
					memberProfileId: "p-tan",
					date: "2026-11-08",
					kind: "SHIFT",
					shiftId: "s-night",
				},
				{
					memberProfileId: "p-siti",
					date: "2026-10-26",
					kind: "OFF",
					shiftId: null,
				},
			],
			undefined
		);
	});

	it("given_onlySevenDays_when_opened_then_noShowEarlierButton", () => {
		show(vi.fn(), onlyTheNearerWeek());

		expect(
			screen.queryByRole("button", { name: "Show 7 earlier days" })
		).not.toBeInTheDocument();
		expect(
			within(
				screen.getByRole("table", { name: "The days before this week" })
			).getByRole("columnheader", { name: "Sun, Nov 8" })
		).toBeInTheDocument();
	});
});
