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
		await userEvent.click(screen.getByRole("radio", { name: "Not working" }));

		expect(chooseMode).toHaveBeenCalledWith("dayOff");
	});

	it("given_theSchedulesTypes_when_notWorkingIsChosen_then_listsThemByLabelWithThePickShown", async () => {
		const setDayType = vi.fn();
		show({
			mode: "dayOff",
			dayTypes: ["OFF", "REST", "PUBLIC_HOLIDAY_OFF"],
			dayType: "REST",
			setDayType,
		});

		const dayType = screen.getByRole("button", { name: "Day type" });
		expect(dayType).toHaveTextContent("Rest day");
		await userEvent.click(dayType);
		expect(
			screen.getAllByRole("option").map((option) => option.textContent)
		).toEqual(["Day off", "Rest day", "Public holiday off"]);
		await userEvent.click(
			screen.getByRole("option", { name: "Public holiday off" })
		);

		expect(setDayType).toHaveBeenCalledWith("PUBLIC_HOLIDAY_OFF");
	});

	it("given_aDayAlreadyNotWorked_when_shown_then_offersAnotherDayType", () => {
		show({ notWorkingWording: "anotherDayType" });

		expect(
			screen.getByRole("radio", { name: "Another day type" })
		).toBeVisible();
	});

	it("given_aPartTimersDayToDecide_when_shown_then_confirmsNoShift", () => {
		show({ notWorkingWording: "confirmNoShift" });

		expect(
			screen.getByRole("radio", { name: "Confirm no shift" })
		).toBeVisible();
	});

	it("given_aPartTimersShift_when_removeShiftIsChosen_then_noTypeToChoose", () => {
		show({ mode: "dayOff", notWorkingWording: "removeShift", dayTypes: [] });

		expect(screen.getByRole("radio", { name: "Remove shift" })).toBeChecked();
		expect(screen.queryByRole("button", { name: "Day type" })).toBeNull();
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
