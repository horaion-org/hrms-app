import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it, vi } from "vitest";
import { authTestI18n } from "@/features/auth/testingI18n";
import {
	PreferredShiftsCell,
	type PreferredShiftsCellProps,
} from "@/features/shiftPreferences/PreferredShiftsCell";

const show = (props: PreferredShiftsCellProps): void => {
	render(
		<I18nextProvider i18n={authTestI18n}>
			<PreferredShiftsCell {...props} />
		</I18nextProvider>
	);
};

describe("PreferredShiftsCell", () => {
	it("given_twoPreferredShifts_when_shown_then_listsAChipForEachInOrder", () => {
		show({ names: ["Morning", "Late"] });

		expect(
			screen.getAllByRole("listitem").map((item) => item.textContent)
		).toEqual(["Morning", "Late"]);
		expect(screen.queryByRole("button")).not.toBeInTheDocument();
	});

	it("given_noPreferredShift_when_shown_then_readsAsNoPreference", () => {
		show({ names: [] });

		expect(screen.getByText("No preference")).toHaveClass("sr-only");
		expect(screen.queryByRole("list")).not.toBeInTheDocument();
	});

	it("given_anEditableDay_when_pressed_then_theWholeCellOpensItsEditor", async () => {
		const onEdit = vi.fn();
		show({
			names: ["Morning"],
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
