import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it, vi } from "vitest";
import { authTestI18n } from "@/features/auth/testingI18n";
import type { CellChoicesState } from "@/features/scheduling/RosterCellPanel/cellPanelState";
import { cellChoicesFixture } from "@/features/scheduling/RosterCellPanel/fixtures";
import { scheduleAssignmentsFixture } from "@/features/scheduling/schedules/fixtures";
import { CellChoices } from "./CellChoices";

const show = (choices: Partial<CellChoicesState> = {}): void => {
	render(
		<I18nextProvider i18n={authTestI18n}>
			<CellChoices
				dayHasShift
				choices={cellChoicesFixture(choices)}
				day="Mon 12 Oct"
				dayNeedsDecision={false}
				name="Aisha Rahman"
				radioName="mode"
			/>
		</I18nextProvider>
	);
};

describe("CellChoices", () => {
	it("given_aWorkingDay_when_aModeIsChosen_then_reportsIt", async () => {
		const chooseMode = vi.fn();
		show({ chooseMode });

		expect(screen.getByRole("radio", { name: "Another shift" })).toBeVisible();
		await userEvent.click(screen.getByRole("radio", { name: "Day off" }));

		expect(chooseMode).toHaveBeenCalledWith("dayOff");
	});

	it("given_noOtherShiftThatDay_when_shiftIsChosen_then_saysWhy", () => {
		show({ mode: "shift" });

		expect(
			screen.getByText("No other shift on Mon 12 Oct is open to Aisha Rahman.")
		).toBeVisible();
	});

	it("given_someoneOnLeaveThatDay_when_swapIsChosen_then_namesThemAsUnavailable", () => {
		const ben = scheduleAssignmentsFixture().find(
			(row) => row.offReason === "LEAVE"
		)!;
		show({ mode: "swap", partners: { available: [], unavailable: [ben] } });

		expect(screen.getByText("Not available: Ben Ong")).toBeVisible();
	});
});
