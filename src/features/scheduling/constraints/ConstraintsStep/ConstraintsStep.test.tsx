import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import { beforeAll, describe, expect, it, vi } from "vitest";
import en from "@/assets/locales/en/translations.json";
import { ConstraintsStep } from "@/features/scheduling/constraints/ConstraintsStep";
import {
	CONSTRAINT_FIXTURES,
	INCLUDED_CONSTRAINT_IDS,
	frozenConstraintsFixture,
} from "@/features/scheduling/constraints/fixtures";
import { constraintRowsOf } from "@/features/scheduling/scheduleDraft";

beforeAll(async () => {
	await createInstance()
		.use(initReactI18next)
		.init({ lng: "en", resources: { en: { translation: en } } });
});

const constraints = CONSTRAINT_FIXTURES;
const includedConstraintIds = INCLUDED_CONSTRAINT_IDS;

const row = (name: string): HTMLElement =>
	within(screen.getByRole("table", { name: "Constraints" })).getByRole("row", {
		name: new RegExp(name),
	});

describe("ConstraintsStep", () => {
	it.each([
		[
			"Morning cover",
			"Staffing",
			"Shift staffing",
			"Staff on Breakfast Prep and Front Desk AM, counting Front Desk Lead and Front Desk Staff, must total at least 2.",
			"Must",
		],
		[
			"Lunch cover with stand-ins",
			"Staffing",
			"Shift staffing with stand-ins",
			"Staff on Lunch Rush, counting Supervisor, should total at least 2, with Service Staff standing in at 2 to one.",
			"Should",
		],
		[
			"Closing supervisor",
			"Role coverage",
			"Role presence",
			"Staff present throughout Closing Crew, counting Supervisor, should be at least 1.",
			"Should",
		],
		[
			"Two days off",
			"Shift pattern",
			"Days off per period",
			"Days off for everyone in any 7-day period must be at least 2.",
			"Must",
		],
		[
			"Weekend days on",
			"Shift pattern",
			"Avoid days off on",
			"Try not to give days off on Friday and Saturday.",
			"Should (always)",
		],
		[
			"Rest between shifts",
			"Working hours",
			"Rest between shifts",
			"Hours of rest between one shift and the next must be at least 10.",
			"Must (always)",
		],
	])(
		"given_%s_when_listed_then_showsItsCategoryTypeSentenceAndRequirement",
		(name, category, type, sentence, requirement) => {
			render(
				<ConstraintsStep
					constraints={constraints}
					includedConstraintIds={includedConstraintIds}
					onIncludedChange={vi.fn()}
				/>
			);

			const cells = within(row(name))
				.getAllByRole("cell")
				.map((cell) => cell.textContent);
			expect(cells.slice(1)).toEqual([
				name,
				`${category}${type}`,
				sentence,
				requirement,
				name === "Weekend days on" ? "Inactive" : "Active",
			]);
		}
	);

	it("given_includedConstraints_when_rendered_then_onlyThoseAreTicked", () => {
		render(
			<ConstraintsStep
				constraints={constraints}
				includedConstraintIds={includedConstraintIds}
				onIncludedChange={vi.fn()}
			/>
		);

		expect(
			screen.getByRole("checkbox", { name: "Select Morning cover" })
		).toBeChecked();
		expect(
			screen.getByRole("checkbox", { name: "Select Two days off" })
		).not.toBeChecked();
	});

	it("given_aConstraint_when_ticked_then_reportsTheNewSelection", async () => {
		const user = userEvent.setup();
		const onIncludedChange = vi.fn();
		render(
			<ConstraintsStep
				constraints={constraints}
				includedConstraintIds={["morning-cover"]}
				onIncludedChange={onIncludedChange}
			/>
		);

		await user.click(
			screen.getByRole("checkbox", { name: "Select Two days off" })
		);

		expect(onIncludedChange).toHaveBeenCalledWith(
			expect.arrayContaining(["morning-cover", "two-days-off"])
		);
	});

	it("given_anInactiveConstraint_when_ticked_then_itIsLeftOutOfTheTicks", async () => {
		const user = userEvent.setup();
		const onIncludedChange = vi.fn();
		render(
			<ConstraintsStep
				constraints={constraints}
				includedConstraintIds={["morning-cover"]}
				onIncludedChange={onIncludedChange}
			/>
		);

		await user.click(
			screen.getByRole("checkbox", { name: "Select Weekend days on" })
		);
		await user.click(screen.getByRole("checkbox", { name: "Select all" }));

		expect(onIncludedChange).toHaveBeenNthCalledWith(1, ["morning-cover"]);
		// Select all ticks every active constraint and still leaves the inactive one out.
		const ticked = onIncludedChange.mock.lastCall?.[0] as Array<string>;
		expect([...ticked].sort()).toEqual(
			constraints
				.filter((constraint) => constraint.status === "ACTIVE")
				.map((constraint) => constraint.constraintId)
				.sort()
		);
	});

	it("given_addEditAndDelete_when_clicked_then_reportsEach", async () => {
		const user = userEvent.setup();
		const onAdd = vi.fn();
		const onEdit = vi.fn();
		const onDelete = vi.fn();
		render(
			<ConstraintsStep
				constraints={constraints}
				includedConstraintIds={includedConstraintIds}
				onAdd={onAdd}
				onDelete={onDelete}
				onEdit={onEdit}
				onIncludedChange={vi.fn()}
			/>
		);

		await user.click(screen.getByRole("button", { name: "Add constraint" }));
		await user.click(screen.getByRole("button", { name: "Edit Two days off" }));
		await user.click(
			screen.getByRole("button", { name: "Delete Weekend days on" })
		);

		expect(onAdd).toHaveBeenCalledOnce();
		expect(onEdit).toHaveBeenCalledWith(
			expect.objectContaining({ constraintId: "two-days-off" })
		);
		expect(onDelete).toHaveBeenCalledWith(
			expect.objectContaining({ constraintId: "weekend-days-on" })
		);
	});

	it("given_noAddEditOrDelete_when_rendered_then_offersNone", () => {
		render(
			<ConstraintsStep
				constraints={constraints}
				includedConstraintIds={includedConstraintIds}
				onIncludedChange={vi.fn()}
			/>
		);

		expect(screen.queryByRole("button", { name: "Add constraint" })).toBeNull();
		expect(
			screen.queryByRole("button", { name: /^(Edit|Delete) / })
		).toBeNull();
		expect(screen.queryByRole("columnheader", { name: "Actions" })).toBeNull();
	});

	it("given_aListProblem_when_rendered_then_saysSoInsteadOfTheTable", () => {
		render(
			<ConstraintsStep
				constraints={[]}
				includedConstraintIds={[]}
				listProblem={{
					message:
						"You don’t have permission to see this department’s constraints.",
					alert: false,
				}}
			/>
		);

		expect(
			screen.getByText(
				"You don’t have permission to see this department’s constraints."
			)
		).toBeVisible();
		expect(screen.queryByRole("table")).toBeNull();
	});

	it("given_aGeneratedSchedule_when_rendered_then_listsItsFrozenConstraintsWithNothingToTickOrChange", () => {
		const frozen = constraintRowsOf(frozenConstraintsFixture());
		render(
			<ConstraintsStep
				frozen
				constraints={frozen}
				includedConstraintIds={frozen.map(
					(constraint) => constraint.constraintId
				)}
			/>
		);

		expect(
			screen.getByText(
				"The constraints this schedule was generated with, as they were then."
			)
		).toBeVisible();
		expect(
			within(screen.getByRole("table", { name: "Constraints" })).getAllByRole(
				"row"
			)
		).toHaveLength(frozen.length + 1);
		// A frozen copy keeps the names it was generated with; a constraint deactivated since is still listed.
		expect(row("Morning cover")).toHaveTextContent(
			"Staff on Breakfast Prep and Front Desk AM"
		);
		expect(row("Rest between shifts")).toBeVisible();
		expect(screen.queryByRole("checkbox")).toBeNull();
		expect(screen.queryByRole("columnheader", { name: "Status" })).toBeNull();
		expect(
			screen.queryByRole("button", { name: /^(Edit|Delete) / })
		).toBeNull();
	});
});
