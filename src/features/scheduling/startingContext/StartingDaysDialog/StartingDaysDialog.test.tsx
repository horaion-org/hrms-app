import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it, vi } from "vitest";
import { authTestI18n } from "@/features/auth/testingI18n";
import type { StartingDays } from "@/features/scheduling/startingContext/api";
import {
	carriedWeek,
	earlierDayTypedWeek,
	firstWeek,
	typedDaysOffWeek,
	WEEK_BEFORE,
} from "@/features/scheduling/startingContext/fixtures";
import { StartingDaysDialog } from "@/features/scheduling/startingContext/StartingDaysDialog";

/** Shown as for a schedule from an older API, which names no day types, unless given some. */
const show = (
	onSave = vi.fn(),
	week = firstWeek(),
	nonWorkingDayTypes: ReadonlyArray<string> = []
): void => {
	render(
		<I18nextProvider i18n={authTestI18n}>
			<StartingDaysDialog
				open
				nonWorkingDayTypes={nonWorkingDayTypes}
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
			name: "The prior days",
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
			screen.getByRole("table", { name: "The prior days" })
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

		expect(onSave).toHaveBeenCalledWith([
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
		]);
	});

	it("given_typedDaysOff_when_shown_then_eachReadsItsTypeAndTheChoicesAreTheSchedulesPlusAnyEntered", async () => {
		show(vi.fn(), typedDaysOffWeek(), ["OFF", "REST"]);

		const table = screen.getByRole("table", {
			name: "The prior days",
		});
		const tan = within(table).getByRole("row", { name: /Tan Wei Ming/ });
		expect(within(tan).getByText("Rest day")).toBeInTheDocument();
		const sitiFriday = within(table).getByRole("button", {
			name: /Siti Rahmah, Fri, Nov 6/,
		});
		expect(sitiFriday).toHaveTextContent("Rest day");
		expect(
			within(table).getByRole("button", { name: /Siti Rahmah, Sat, Nov 7/ })
		).toHaveTextContent("Public holiday off");
		await userEvent.click(sitiFriday);
		expect(
			screen.getAllByRole("option").map((option) => option.textContent)
		).toEqual([
			"Not known",
			"Day off",
			"Rest day",
			"Public holiday off",
			"Day 07:00 – 19:00",
			"Night 22:00 – 06:00",
		]);
	});

	it("given_aRestDayChosen_when_aDayIsFilledAndSaved_then_itIsSentWithItsType", async () => {
		const user = userEvent.setup();
		const onSave = vi.fn();
		show(onSave, firstWeek(), ["OFF", "REST"]);

		expect(screen.getByRole("button", { name: "Fill with" })).toHaveTextContent(
			"Day off"
		);
		await user.click(screen.getByRole("button", { name: "Fill with" }));
		await user.click(screen.getByRole("option", { name: "Rest day" }));
		await user.click(screen.getByRole("button", { name: "Fill empty days" }));
		await user.click(screen.getByRole("button", { name: "Save days" }));

		expect(onSave).toHaveBeenCalledWith([
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
				dayType: "REST",
			},
		]);
	});

	it("given_fourteenDays_when_opened_then_onlyTheNearerWeekIsShown", () => {
		show();

		const table = screen.getByRole("table", {
			name: "The prior days",
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
			name: "The prior days",
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
			within(screen.getByRole("table", { name: "The prior days" })).getByRole(
				"columnheader",
				{ name: "Fri, Oct 30" }
			)
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

		expect(onSave).toHaveBeenCalledWith([
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
		]);
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

		expect(onSave).toHaveBeenCalledWith([
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
		]);
	});

	it("given_onlySevenDays_when_opened_then_noShowEarlierButton", () => {
		show(vi.fn(), onlyTheNearerWeek());

		expect(
			screen.queryByRole("button", { name: "Show 7 earlier days" })
		).not.toBeInTheDocument();
		expect(
			within(screen.getByRole("table", { name: "The prior days" })).getByRole(
				"columnheader",
				{ name: "Sun, Nov 8" }
			)
		).toBeInTheDocument();
	});
});
