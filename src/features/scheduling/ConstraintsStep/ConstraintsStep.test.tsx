import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import { beforeAll, describe, expect, it, vi } from "vitest";
import en from "@/assets/locales/en/translations.json";
import { ConstraintsStep } from "@/features/scheduling/ConstraintsStep";
import { emptyScheduleDraft } from "@/features/scheduling/scheduleDraft";

beforeAll(async () => {
	await createInstance()
		.use(initReactI18next)
		.init({ lng: "en", resources: { en: { translation: en } } });
});

const { constraints, includedConstraintIds } = emptyScheduleDraft();

const names = (table: HTMLElement): Array<string> =>
	within(table)
		.getAllByRole("row")
		.slice(1)
		.map((row) => within(row).getAllByRole("cell")[1]?.textContent ?? "");

describe("ConstraintsStep", () => {
	it("given_constraints_when_rendered_then_showsTypePriorityAndStatus", () => {
		render(
			<ConstraintsStep
				constraints={constraints}
				includedConstraintIds={includedConstraintIds}
				onAdd={vi.fn()}
				onDelete={vi.fn()}
				onIncludedChange={vi.fn()}
			/>
		);

		const row = screen.getByRole("row", { name: /Rest Between Shifts/ });
		expect(row).toHaveTextContent("Working hours");
		expect(row).toHaveTextContent("High");
		expect(row).toHaveTextContent("Draft");
		expect(row).toHaveTextContent(
			"Employees should have at least 10 hours between consecutive shifts"
		);
	});

	it("given_thePriorityColumn_when_sorted_then_ordersHighToLow", async () => {
		const user = userEvent.setup();
		render(
			<ConstraintsStep
				constraints={[...constraints].reverse()}
				includedConstraintIds={includedConstraintIds}
				onAdd={vi.fn()}
				onDelete={vi.fn()}
				onIncludedChange={vi.fn()}
			/>
		);

		await user.click(screen.getByRole("button", { name: "Sort by Priority" }));

		const table = screen.getByRole("table", { name: "Constraints" });
		expect(names(table).slice(-1)).toEqual(["Weekend Staffing Coverage"]);
		expect(names(table).slice(0, 3)).toEqual(
			expect.arrayContaining(["Minimum Shift Staffing", "Rest Between Shifts"])
		);
	});

	it("given_aConstraint_when_deleteClicked_then_reportsIt", async () => {
		const user = userEvent.setup();
		const onDelete = vi.fn();
		render(
			<ConstraintsStep
				constraints={constraints}
				includedConstraintIds={includedConstraintIds}
				onAdd={vi.fn()}
				onDelete={onDelete}
				onIncludedChange={vi.fn()}
			/>
		);

		await user.click(
			screen.getByRole("button", { name: "Delete Minimum Daily Staffing" })
		);

		expect(onDelete).toHaveBeenCalledWith(
			expect.objectContaining({ constraintId: "minimum-daily-staffing" })
		);
	});

	it("given_addClicked_when_rendered_then_asksToAdd", async () => {
		const user = userEvent.setup();
		const onAdd = vi.fn();
		render(
			<ConstraintsStep
				constraints={constraints}
				includedConstraintIds={includedConstraintIds}
				onAdd={onAdd}
				onDelete={vi.fn()}
				onIncludedChange={vi.fn()}
			/>
		);

		await user.click(screen.getByRole("button", { name: "Add constraint" }));

		expect(onAdd).toHaveBeenCalled();
	});

	it("given_theApiIsMissing_when_rendered_then_editIsDisabled", () => {
		render(
			<ConstraintsStep
				constraints={constraints}
				includedConstraintIds={includedConstraintIds}
				onAdd={vi.fn()}
				onDelete={vi.fn()}
				onIncludedChange={vi.fn()}
			/>
		);

		expect(
			screen.getByRole("button", { name: "Edit Rest Between Shifts" })
		).toBeDisabled();
	});
});
