import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import { beforeAll, describe, expect, it, vi } from "vitest";
import en from "@/assets/locales/en/translations.json";
import {
	INCLUDED_SHIFT_IDS,
	SHIFT_FIXTURES,
	frozenShiftsFixture,
} from "@/features/scheduling/shifts/fixtures";
import { groupsOf } from "@/features/scheduling/shifts/api";
import { ShiftsStep } from "@/features/scheduling/shifts/ShiftsStep";

beforeAll(async () => {
	await createInstance()
		.use(initReactI18next)
		.init({ lng: "en", resources: { en: { translation: en } } });
});

const shifts = SHIFT_FIXTURES;
const includedShiftIds = INCLUDED_SHIFT_IDS;

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
		expect(row).toHaveTextContent("2 roles");
		expect(screen.getByRole("tab", { name: /Front Desk/ })).toBeVisible();
	});

	it("given_aGroupTab_when_chosen_then_showsOnlyThatGroupAndKeepsTheSelection", async () => {
		const user = userEvent.setup();
		const onIncludedChange = vi.fn();
		render(
			<ShiftsStep
				includedShiftIds={includedShiftIds}
				shifts={shifts}
				onIncludedChange={onIncludedChange}
			/>
		);
		const table = screen.getByRole("table", { name: "Shifts" });
		expect(within(table).getAllByRole("row")).toHaveLength(shifts.length + 1);
		const tabs = screen.getByRole("tablist", { name: "Shift groups" });
		expect(within(tabs).getAllByRole("tab")).toHaveLength(
			groupsOf(shifts).length + 1
		);
		expect(within(tabs).getByRole("tab", { name: /^All/ })).toHaveAttribute(
			"aria-selected",
			"true"
		);

		await user.click(within(tabs).getByRole("tab", { name: /Service/ }));
		expect(within(table).getAllByRole("row")).toHaveLength(4);
		expect(
			within(table).getByRole("row", { name: /Lunch Rush/ })
		).toBeVisible();
		expect(
			within(table).queryByRole("row", { name: /Front Desk AM/ })
		).toBeNull();

		await user.click(
			screen.getByRole("checkbox", { name: "Select Closing Crew" })
		);
		expect(onIncludedChange).toHaveBeenCalledWith(
			expect.arrayContaining([...includedShiftIds, "closing-crew"])
		);
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

	it("given_noAddEditOrDelete_when_rendered_then_offersNone", () => {
		render(
			<ShiftsStep
				includedShiftIds={includedShiftIds}
				shifts={shifts}
				onIncludedChange={vi.fn()}
			/>
		);

		expect(
			screen.queryByRole("button", { name: "Add custom shift" })
		).toBeNull();
		expect(screen.queryByRole("button", { name: /^Edit / })).toBeNull();
		expect(screen.queryByRole("button", { name: /^Delete / })).toBeNull();
	});

	it("given_addAndEdit_when_clicked_then_reportsEach", async () => {
		const user = userEvent.setup();
		const onAdd = vi.fn();
		const onEdit = vi.fn();
		render(
			<ShiftsStep
				includedShiftIds={includedShiftIds}
				shifts={shifts}
				onAdd={onAdd}
				onEdit={onEdit}
				onIncludedChange={vi.fn()}
			/>
		);

		await user.click(screen.getByRole("button", { name: "Add custom shift" }));
		await user.click(
			screen.getByRole("button", { name: "Edit Front Desk AM" })
		);

		expect(onAdd).toHaveBeenCalledOnce();
		expect(onEdit).toHaveBeenCalledWith(
			expect.objectContaining({ shiftId: "front-desk-am" })
		);
	});

	it("given_aListProblem_when_rendered_then_saysSoInsteadOfTheTable", () => {
		render(
			<ShiftsStep
				includedShiftIds={[]}
				listProblem={{ message: "We couldn’t load shifts.", alert: true }}
				shifts={[]}
				onIncludedChange={vi.fn()}
			/>
		);

		expect(screen.getByRole("alert")).toHaveTextContent(
			"We couldn’t load shifts."
		);
		expect(screen.queryByRole("table")).toBeNull();
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

	it("given_aGeneratedSchedule_when_rendered_then_listsItsFrozenShiftsWithNothingToTickOrChange", () => {
		const frozen = frozenShiftsFixture();
		render(
			<ShiftsStep
				frozen
				includedShiftIds={frozen.map((shift) => shift.shiftId)}
				shifts={frozen}
			/>
		);

		expect(
			screen.getByText(
				"The shifts this schedule was generated with, as they were then."
			)
		).toBeVisible();
		const table = screen.getByRole("table", { name: "Shifts" });
		// A copy whose source shift was since deleted is still listed in full.
		const copy = within(table).getByRole("row", { name: /Breakfast Prep/ });
		expect(copy).toBeVisible();
		expect(copy).toHaveTextContent("06:00 – 12:00");
		expect(copy).toHaveTextContent("Mon, Wed, Fri, Sat");
		expect(copy).toHaveTextContent("2 roles");
		expect(within(table).getAllByRole("row")).toHaveLength(frozen.length + 1);
		expect(screen.queryByRole("checkbox")).toBeNull();
		expect(
			screen.queryByRole("button", { name: /^(Edit|Delete) / })
		).toBeNull();
	});
});
