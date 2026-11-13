import { composeStories } from "@storybook/react-vite";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it } from "vitest";
import * as stories from "./UnitReachField.stories";

const { WholeCompany, ChosenBranches, NoDepartmentChosen, DepartmentsOnly } =
	composeStories(stories);

it("given_wholeCompany_when_shown_then_threeChoicesAndNoUnitsToPick", () => {
	render(<WholeCompany />);

	const group = screen.getByRole("radiogroup", { name: /Applies to/ });
	expect(within(group).getAllByRole("radio")).toHaveLength(3);
	expect(screen.getByRole("radio", { name: "Whole company" })).toBeChecked();
	expect(screen.queryByRole("button", { name: /Chosen/ })).toBeNull();
});

it("given_wholeCompany_when_chosenBranchesIsPicked_then_asksForBranchesWithTheLaterDepartmentsHint", async () => {
	const user = userEvent.setup();
	render(<WholeCompany />);

	await user.click(screen.getByRole("radio", { name: "Chosen branches" }));

	expect(screen.getByRole("button", { name: "Chosen branches" })).toBeVisible();
	expect(
		screen.getByText("A branch includes departments added to it later.")
	).toBeVisible();
});

it("given_chosenBranches_when_shown_then_theBranchIsPicked", () => {
	render(<ChosenBranches />);

	expect(screen.getByRole("radio", { name: "Chosen branches" })).toBeChecked();
	expect(
		screen.getByRole("button", { name: "Chosen branches" })
	).toHaveTextContent("Orchard");
});

it("given_departmentsUnderTwoBranches_when_theSelectOpens_then_eachBranchHeadsItsOwn", async () => {
	const user = userEvent.setup();
	render(<NoDepartmentChosen />);

	await user.click(screen.getByRole("button", { name: "Chosen departments" }));

	expect(screen.getByRole("group", { name: "Orchard" })).toBeVisible();
	expect(screen.getByRole("group", { name: "Marina" })).toBeVisible();
	expect(screen.getByText("Choose at least one department.")).toBeVisible();
});

it("given_onlyDepartmentsOffered_when_shown_then_oneCheckedChoiceWithTheirDepartment", () => {
	render(<DepartmentsOnly />);

	const group = screen.getByRole("radiogroup", { name: /Applies to/ });
	expect(within(group).getAllByRole("radio")).toHaveLength(1);
	expect(
		screen.getByRole("radio", { name: "Chosen departments" })
	).toBeChecked();
	expect(
		screen.getByRole("button", { name: "Chosen departments" })
	).toHaveTextContent("Kitchen");
});
