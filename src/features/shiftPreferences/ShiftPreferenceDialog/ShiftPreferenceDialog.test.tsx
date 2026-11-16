import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it, vi } from "vitest";
import { authTestI18n } from "@/features/auth/testingI18n";
import { MONDAY_WITH_MORNING } from "@/features/shiftPreferences/fixtures";
import {
	ShiftPreferenceDialog,
	type ShiftPreferenceDialogProps,
} from "@/features/shiftPreferences/ShiftPreferenceDialog";

const show = (
	props: Partial<ShiftPreferenceDialogProps> = {}
): { onSave: ReturnType<typeof vi.fn>; onClose: ReturnType<typeof vi.fn> } => {
	const onSave = vi.fn();
	const onClose = vi.fn();
	render(
		<I18nextProvider i18n={authTestI18n}>
			<ShiftPreferenceDialog
				day={MONDAY_WITH_MORNING}
				dayLabel="Mon 23 Nov"
				maxShifts={5}
				saving={false}
				onClose={onClose}
				onSave={onSave}
				{...props}
			/>
		</I18nextProvider>
	);
	return { onSave, onClose };
};

const box = (name: RegExp): HTMLElement =>
	screen.getByRole("checkbox", { name });

describe("ShiftPreferenceDialog", () => {
	it("given_aDay_when_opened_then_listsItsShiftsWithTheChosenOnesTickedAndTheCount", () => {
		show();

		expect(
			screen.getByRole("dialog", { name: "Choose shifts for Mon 23 Nov" })
		).toBeVisible();
		expect(box(/^Morning/)).toBeChecked();
		expect(box(/^Late/)).not.toBeChecked();
		expect(screen.getByText("07:00 – 15:00")).toBeVisible();
		expect(screen.getByText("1 of 5 chosen")).toBeVisible();
	});

	it("given_anotherShiftTicked_when_saved_then_sendsEveryChosenShift", async () => {
		const { onSave } = show();

		await userEvent.click(box(/^Late/));
		expect(screen.getByText("2 of 5 chosen")).toBeVisible();
		await userEvent.click(screen.getByRole("button", { name: "Save" }));

		expect(onSave).toHaveBeenCalledExactlyOnceWith(["s-morning", "s-late"]);
	});

	it("given_theDaysLimitReached_when_shown_then_onlyAChosenShiftCanBeChanged", async () => {
		show({ maxShifts: 1 });

		expect(box(/^Late/)).toBeDisabled();
		expect(box(/^Morning/)).toBeEnabled();
		await userEvent.click(box(/^Morning/));

		expect(box(/^Late/)).toBeEnabled();
	});

	it("given_chosenShifts_when_cleared_then_savesTheDayWithNone", async () => {
		const { onSave } = show();

		await userEvent.click(screen.getByRole("button", { name: "Clear" }));

		expect(onSave).toHaveBeenCalledExactlyOnceWith([]);
	});

	it("given_aDayWithNoShiftForTheirJobTitle_when_opened_then_saysSo", () => {
		show({ day: { ...MONDAY_WITH_MORNING, shifts: [] } });

		expect(
			screen.getByText("No shift that day needs your job title.")
		).toBeVisible();
		expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
	});

	it("given_aSaveInFlight_when_shown_then_saysSavingAndHoldsClear", () => {
		show({ saving: true });

		expect(screen.getByRole("button", { name: "Saving…" })).toBeDisabled();
		expect(screen.getByRole("button", { name: "Clear" })).toBeDisabled();
	});

	it("given_aDayWithoutAvailability_when_opened_then_warnsAndStillOffersItsShifts", () => {
		show({
			unavailableNote: "You haven’t marked yourself available on Mon 23 Nov.",
		});

		expect(
			screen.getByText("You haven’t marked yourself available on Mon 23 Nov.")
		).toBeVisible();
		expect(screen.getAllByRole("checkbox").length).toBeGreaterThan(0);
	});

	it("given_aRefusedSave_when_shown_then_saysWhyAsAnAlert", () => {
		show({ refusal: "Choose up to 5 shifts for a day." });

		expect(screen.getByRole("alert")).toHaveTextContent(
			"Choose up to 5 shifts for a day."
		);
	});
});
