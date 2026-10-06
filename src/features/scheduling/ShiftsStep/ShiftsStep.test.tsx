import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import { beforeAll, describe, expect, it, vi } from "vitest";
import en from "@/assets/locales/en/translations.json";
import { seedScheduleDraft } from "@/features/scheduling/scheduleDraft";
import { ShiftsStep } from "@/features/scheduling/ShiftsStep";

beforeAll(async () => {
	await createInstance()
		.use(initReactI18next)
		.init({ lng: "en", resources: { en: { translation: en } } });
});

const { shifts, includedShiftIds } = seedScheduleDraft();

describe("ShiftsStep", () => {
	it("given_shifts_when_rendered_then_listsEachWithItsTimesDaysAndRoles", () => {
		render(
			<ShiftsStep
				includedShiftIds={includedShiftIds}
				shifts={shifts}
				onDelete={vi.fn()}
				onIncludedChange={vi.fn()}
			/>
		);

		const table = screen.getByRole("table", { name: "Shifts" });
		const row = within(table).getByRole("row", { name: /Front Desk AM/ });
		expect(row).toHaveTextContent("09:00 – 15:00");
		expect(row).toHaveTextContent("Mon, Tue, Wed, Thu, Fri");
		expect(row).toHaveTextContent("4 roles");
	});

	it("given_includedShifts_when_rendered_then_onlyThoseAreTicked", () => {
		render(
			<ShiftsStep
				includedShiftIds={includedShiftIds}
				shifts={shifts}
				onDelete={vi.fn()}
				onIncludedChange={vi.fn()}
			/>
		);

		expect(
			screen.getByRole("checkbox", { name: "Select Front Desk AM" })
		).toBeChecked();
		expect(
			screen.getByRole("checkbox", { name: "Select Concierge Support" })
		).not.toBeChecked();
	});

	it("given_aShift_when_ticked_then_reportsTheNewSelection", async () => {
		const user = userEvent.setup();
		const onIncludedChange = vi.fn();
		render(
			<ShiftsStep
				includedShiftIds={["front-desk-am"]}
				shifts={shifts}
				onDelete={vi.fn()}
				onIncludedChange={onIncludedChange}
			/>
		);

		await user.click(
			screen.getByRole("checkbox", { name: "Select Lunch Rush" })
		);

		expect(onIncludedChange).toHaveBeenCalledWith(
			expect.arrayContaining(["front-desk-am", "lunch-rush"])
		);
	});

	it("given_aShift_when_deleteClicked_then_reportsThatShift", async () => {
		const user = userEvent.setup();
		const onDelete = vi.fn();
		render(
			<ShiftsStep
				includedShiftIds={includedShiftIds}
				shifts={shifts}
				onDelete={onDelete}
				onIncludedChange={vi.fn()}
			/>
		);

		await user.click(
			screen.getByRole("button", { name: "Delete Swing Shift" })
		);

		expect(onDelete).toHaveBeenCalledWith(
			expect.objectContaining({ shiftId: "swing-shift" })
		);
	});

	it("given_theApiIsMissing_when_rendered_then_addAndEditAreDisabled", () => {
		render(
			<ShiftsStep
				includedShiftIds={includedShiftIds}
				shifts={shifts}
				onDelete={vi.fn()}
				onIncludedChange={vi.fn()}
			/>
		);

		expect(
			screen.getByRole("button", { name: "Add Custom Shift" })
		).toBeDisabled();
		expect(
			screen.getByRole("button", { name: "Edit Front Desk AM" })
		).toBeDisabled();
	});

	it("given_aProblem_when_rendered_then_announcesIt", () => {
		render(
			<ShiftsStep
				includedShiftIds={[]}
				problem="Choose at least one shift to include in this schedule."
				shifts={shifts}
				onDelete={vi.fn()}
				onIncludedChange={vi.fn()}
			/>
		);

		expect(screen.getByRole("alert")).toHaveTextContent(
			"Choose at least one shift to include in this schedule."
		);
	});
});
