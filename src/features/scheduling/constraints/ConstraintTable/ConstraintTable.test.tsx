import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import { beforeAll, describe, expect, it, vi } from "vitest";
import en from "@/assets/locales/en/translations.json";
import { ConstraintTable } from "@/features/scheduling/constraints/ConstraintTable";
import {
	COMPANY_CONSTRAINT_FIXTURES,
	CONSTRAINT_FIXTURES,
} from "@/features/scheduling/constraints/fixtures";

beforeAll(async () => {
	await createInstance()
		.use(initReactI18next)
		.init({ lng: "en", resources: { en: { translation: en } } });
});

/** The locked Company rest, then Front Office's Morning cover and Bar's Lunch cover. */
const companyRest = COMPANY_CONSTRAINT_FIXTURES[0]!;
const morningCover = CONSTRAINT_FIXTURES[2]!;
const barCover = {
	...CONSTRAINT_FIXTURES[1]!,
	departmentId: "d-2",
	departmentName: "Bar",
};
const rows = [companyRest, morningCover, barCover];

const row = (name: string): HTMLElement =>
	within(screen.getByRole("table", { name: "Constraints" })).getByRole("row", {
		name: new RegExp(name),
	});

const headers = (): Array<string> =>
	screen.getAllByRole("columnheader").map((header) => header.textContent ?? "");

describe("ConstraintTable", () => {
	it("given_noBranchOrDepartmentChosen_when_rendered_then_namesEachRowsBranchAndDepartment", () => {
		render(<ConstraintTable showBranch showDepartment constraints={rows} />);

		expect(headers()).toEqual(expect.arrayContaining(["Branch", "Department"]));
		expect(row(morningCover.name)).toHaveTextContent("Front Office");
		expect(row(morningCover.name)).toHaveTextContent("Main branch");
		expect(row(barCover.name)).toHaveTextContent("Bar");
	});

	it("given_aCompanyRow_when_departmentsShown_then_readsAllDepartments", () => {
		render(<ConstraintTable showDepartment constraints={rows} />);

		expect(row(companyRest.name)).toHaveTextContent("All departments");
	});

	it("given_branchAndDepartmentChosen_when_rendered_then_leavesTheirColumnsOut", () => {
		render(<ConstraintTable constraints={rows} />);

		expect(headers()).not.toContain("Branch");
		expect(headers()).not.toContain("Department");
	});

	it("given_replace_when_offered_then_onlyCompanyRowsHaveItAndOnlyDepartmentRowsEditOrDelete", async () => {
		const user = userEvent.setup();
		const onReplace = vi.fn();
		render(
			<ConstraintTable
				constraints={rows}
				onDelete={vi.fn()}
				onEdit={vi.fn()}
				onReplace={onReplace}
			/>
		);

		expect(
			within(row(morningCover.name)).queryByRole("button", {
				name: /stricter here|for this department/,
			})
		).toBeNull();
		expect(
			within(row(companyRest.name)).queryByRole("button", {
				name: /^(Edit|Delete) /,
			})
		).toBeNull();

		await user.click(
			screen.getByRole("button", { name: "Make Company rest stricter here" })
		);
		expect(onReplace).toHaveBeenCalledWith(companyRest);
	});

	it("given_editAndDeleteByRow_when_rendered_then_eachButtonFollowsItsOwnRule", () => {
		render(
			<ConstraintTable
				canDelete={(constraint) => constraint.departmentName === "Bar"}
				canEdit={(constraint) => constraint.departmentName !== "Bar"}
				constraints={rows}
				onDelete={vi.fn()}
				onEdit={vi.fn()}
			/>
		);

		expect(
			screen.getByRole("button", { name: `Edit ${morningCover.name}` })
		).toBeVisible();
		expect(
			screen.queryByRole("button", { name: `Delete ${morningCover.name}` })
		).toBeNull();
		expect(
			screen.queryByRole("button", { name: `Edit ${barCover.name}` })
		).toBeNull();
		expect(
			screen.getByRole("button", { name: `Delete ${barCover.name}` })
		).toBeVisible();
	});

	const headersHiddenBelow = (classes: string): Array<string | null> =>
		screen
			.getAllByRole("columnheader")
			.filter((header) => header.className.includes(classes))
			.map((header) => header.textContent);

	it("given_aPhone_when_rendered_then_keepsOnlyTheNameAndActionsAsColumns", () => {
		render(
			<ConstraintTable
				showBranch
				showDepartment
				constraints={rows}
				onDelete={vi.fn()}
				onEdit={vi.fn()}
			/>
		);

		expect(headersHiddenBelow("hidden md:table-cell")).toEqual([
			"Branch",
			"Department",
			"Constraint type",
			"Details",
		]);
		expect(headersHiddenBelow("hidden 2xl:table-cell")).toEqual([
			"Set by",
			"Requirement",
			"Status",
		]);
	});

	it.each<[string, boolean, Array<string>, Array<string>]>([
		[
			"every department",
			true,
			["Department", "Constraint type", "Details"],
			["Set by", "Requirement", "Status"],
		],
		[
			"one department",
			false,
			["Constraint type", "Details", "Set by", "Requirement", "Status"],
			[],
		],
	])(
		"given_%s_when_rendered_then_hidesTheSettingsColumnsAtTheirBreakpoint",
		(_shown, showDepartment, belowMd, below2xl) => {
			render(
				<ConstraintTable
					constraints={rows}
					showDepartment={showDepartment}
					onDelete={vi.fn()}
					onEdit={vi.fn()}
				/>
			);

			expect(headersHiddenBelow("hidden md:table-cell")).toEqual(belowMd);
			expect(headersHiddenBelow("hidden 2xl:table-cell")).toEqual(below2xl);
		}
	);

	it("given_noRows_when_rendered_then_showsTheEmptyStateGiven", () => {
		render(<ConstraintTable constraints={[]} emptyState="Nothing matches." />);

		expect(screen.getByText("Nothing matches.")).toBeVisible();
	});
});
