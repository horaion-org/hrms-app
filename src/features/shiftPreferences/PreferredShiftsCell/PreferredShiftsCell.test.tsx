import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it, vi } from "vitest";
import { authTestI18n } from "@/features/auth/testingI18n";
import {
	PreferredShiftsCell,
	type PreferredShiftsCellProps,
} from "@/features/shiftPreferences/PreferredShiftsCell";

const MORNING = { shiftId: "s-morning", name: "Morning" };
const LATE = { shiftId: "s-late", name: "Late" };

const show = (props: PreferredShiftsCellProps): void => {
	render(
		<I18nextProvider i18n={authTestI18n}>
			<PreferredShiftsCell {...props} />
		</I18nextProvider>
	);
};

describe("PreferredShiftsCell", () => {
	it("given_twoShiftsOfTheSameName_when_shown_then_listsBoth", () => {
		show({ shifts: [MORNING, { shiftId: "s-morning-2", name: "Morning" }] });

		expect(
			screen.getAllByRole("listitem").map((item) => item.textContent)
		).toEqual(["Morning", "Morning"]);
	});

	it("given_twoPreferredShifts_when_shown_then_listsAChipForEachInOrder", () => {
		show({ shifts: [MORNING, LATE] });

		expect(
			screen.getAllByRole("listitem").map((item) => item.textContent)
		).toEqual(["Morning", "Late"]);
		expect(screen.queryByRole("button")).not.toBeInTheDocument();
	});

	it("given_noPreferredShift_when_shown_then_readsAsNoPreference", () => {
		show({ shifts: [] });

		expect(screen.getByText("No preference")).toHaveClass("sr-only");
		// The icon set's minus, not a typed dash.
		expect(screen.queryByText("—")).not.toBeInTheDocument();
		expect(screen.queryByRole("list")).not.toBeInTheDocument();
	});

	it("given_anEditableDay_when_pressed_then_theWholeCellOpensItsEditor", async () => {
		const onEdit = vi.fn();
		show({
			shifts: [MORNING],
			onEdit,
			editLabel: "Choose shifts for Mon 23 Nov",
		});

		const cell = screen.getByRole("button", {
			name: "Choose shifts for Mon 23 Nov",
		});
		expect(cell).toHaveTextContent("Morning");
		await userEvent.click(cell);

		expect(onEdit).toHaveBeenCalledOnce();
	});
});
