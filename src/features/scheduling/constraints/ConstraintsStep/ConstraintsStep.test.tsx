import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import { beforeAll, describe, expect, it, vi } from "vitest";
import en from "@/assets/locales/en/translations.json";
import { ConstraintsStep } from "@/features/scheduling/constraints/ConstraintsStep";
import {
	COMPANY_CONSTRAINT_FIXTURES,
	CONSTRAINT_FIXTURES,
	INCLUDED_CONSTRAINT_IDS,
	constraintFixture,
	frozenConstraintsFixture,
} from "@/features/scheduling/constraints/fixtures";

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
				"This department",
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

		expect(
			screen.getByRole("checkbox", { name: "Select Weekend days on" })
		).toBeDisabled();
		await user.click(screen.getByRole("checkbox", { name: "Select all" }));

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
		const frozen = frozenConstraintsFixture();
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
		// A frozen copy keeps the names it was generated with; one whose source was deactivated since is still listed in full.
		expect(row("Morning cover")).toHaveTextContent(
			"Staff on Breakfast Prep and Front Desk AM"
		);
		expect(row("Rest between shifts")).toHaveTextContent(
			"Hours of rest between one shift and the next must be at least 10."
		);
		expect(screen.queryByRole("checkbox")).toBeNull();
		expect(screen.queryByRole("columnheader", { name: "Status" })).toBeNull();
		expect(
			screen.queryByRole("button", { name: /^(Edit|Delete) / })
		).toBeNull();
	});
	describe("with the company's Scheduling policy (ADR-0058)", () => {
		const [companyRest, companyWeekends] = COMPANY_CONSTRAINT_FIXTURES as [
			(typeof COMPANY_CONSTRAINT_FIXTURES)[number],
			(typeof COMPANY_CONSTRAINT_FIXTURES)[number],
		];
		const withPolicy = [...COMPANY_CONSTRAINT_FIXTURES, ...CONSTRAINT_FIXTURES];

		it("given_aLockedCompanyConstraint_when_rendered_then_itIsTickedAndCannotBeUnticked", async () => {
			const user = userEvent.setup();
			const onIncludedChange = vi.fn();
			render(
				<ConstraintsStep
					constraints={withPolicy}
					includedConstraintIds={["morning-cover"]}
					onIncludedChange={onIncludedChange}
				/>
			);

			const locked = screen.getByRole("checkbox", {
				name: "Select Company rest",
			});
			expect(locked).toBeChecked();
			expect(locked).toBeDisabled();
			expect(row("Company rest")).toHaveTextContent("Company · Locked");
			expect(row("Company weekends")).toHaveTextContent("Company · Default");

			await user.click(
				screen.getByRole("checkbox", { name: "Select Morning cover" })
			);

			// Unticking the rest still leaves the locked constraint ticked.
			expect(onIncludedChange).toHaveBeenLastCalledWith(["company-rest"]);
		});

		it("given_companyConstraints_when_changeable_then_offeredOnlyAsAReplacementForTheDepartment", async () => {
			const user = userEvent.setup();
			const onReplace = vi.fn();
			render(
				<ConstraintsStep
					constraints={withPolicy}
					includedConstraintIds={[]}
					onDelete={vi.fn()}
					onEdit={vi.fn()}
					onReplace={onReplace}
				/>
			);

			expect(
				within(row("Company rest")).queryByRole("button", {
					name: /^(Edit|Delete) /,
				})
			).toBeNull();
			await user.click(
				screen.getByRole("button", { name: "Make Company rest stricter here" })
			);
			await user.click(
				screen.getByRole("button", {
					name: "Change Company weekends for this department",
				})
			);

			expect(onReplace).toHaveBeenNthCalledWith(1, companyRest);
			expect(onReplace).toHaveBeenNthCalledWith(2, companyWeekends);
		});

		it("given_aCompanyConstraintReplacedHere_when_rendered_then_onlyItsReplacementShowsAsStricterHere", () => {
			const stricter = constraintFixture({
				constraintId: "front-rest",
				name: "Front rest",
				type: "REST_BETWEEN_SHIFTS",
				category: "WORKING_HOURS",
				requirement: null,
				values: [{ field: "REST_HOURS", value: "12", name: null }],
				locked: true,
				overridesConstraintId: "company-rest",
			});
			render(
				<ConstraintsStep
					includedConstraintIds={[]}
					constraints={[
						{ ...companyRest, overriddenByConstraintId: "front-rest" },
						stricter,
					]}
					onIncludedChange={vi.fn()}
				/>
			);

			expect(screen.queryByRole("row", { name: /Company rest/ })).toBeNull();
			expect(row("Front rest")).toHaveTextContent("Stricter here");
			expect(
				screen.getByRole("checkbox", { name: "Select Front rest" })
			).toBeChecked();
		});

		it("given_aTickedCompanyDefaultReplacedSinceTheDraftWasSaved_when_rendered_then_itsReplacementIsTickedAndStaysSoWhenAnotherTickChanges", async () => {
			const user = userEvent.setup();
			const onIncludedChange = vi.fn();
			const changedHere = constraintFixture({
				constraintId: "front-weekends",
				name: "Front weekends",
				type: "AVOID_DAYS_OFF_ON",
				category: "SHIFT_PATTERN",
				requirement: null,
				values: [{ field: "WEEKDAY", value: "SUN", name: null }],
				overridesConstraintId: "company-weekends",
				replacementStatus: "STANDS_IN",
			});
			render(
				<ConstraintsStep
					// The draft still holds the company default's tick, as the API keeps it.
					includedConstraintIds={["company-weekends", "morning-cover"]}
					constraints={[
						{ ...companyWeekends, overriddenByConstraintId: "front-weekends" },
						changedHere,
						...CONSTRAINT_FIXTURES,
					]}
					onIncludedChange={onIncludedChange}
				/>
			);

			expect(row("Front weekends")).toHaveTextContent("Changed here");
			expect(
				screen.getByRole("checkbox", { name: "Select Front weekends" })
			).toBeChecked();

			await user.click(
				screen.getByRole("checkbox", { name: "Select Morning cover" })
			);

			expect(onIncludedChange).toHaveBeenLastCalledWith(["front-weekends"]);
		});
	});
});
