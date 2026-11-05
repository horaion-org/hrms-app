import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it, vi } from "vitest";
import { authTestI18n } from "@/features/auth/testingI18n";
import {
	carriedWeek,
	firstWeek,
	rosterOffCell,
} from "@/features/scheduling/startingContext/fixtures";
import { StartingDaysDialog } from "@/features/scheduling/startingContext/StartingDaysDialog";

const show = (onSave = vi.fn(), week = firstWeek()): void => {
	render(
		<I18nextProvider i18n={authTestI18n}>
			<StartingDaysDialog
				open
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
});
