import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState, type ReactElement } from "react";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it, vi } from "vitest";
import { effectiveWorkspace } from "@/common/testing/effectiveWorkspace";
import { authTestI18n } from "@/features/auth/testingI18n";
import { workspaceQuery, type Workspace } from "@/features/workspace/api";
import { UnitSelector } from "@/features/workspace/UnitSelector";
import type {
	UnitSelection,
	UnitSelectionRules,
} from "@/features/workspace/unitSelection";
import { useUnitSelection } from "@/features/workspace/useUnitSelection";

const PEOPLE_READ = "member_profile:read";
const TABLE: UnitSelectionRules = {
	allowAllBranches: true,
	withDepartment: true,
};
const GRID: UnitSelectionRules = {
	allowAllBranches: false,
	withDepartment: true,
};
const FIRST_THEN_ALL: UnitSelectionRules = {
	allowAllBranches: true,
	startOnFirstBranch: true,
	withDepartment: true,
};

type Branches = Workspace["companies"][number]["branches"];

/** As the API sends it: grants made above a unit are effective at it too. */
const workspace = (
	branches: Branches,
	permissions: Array<string> = []
): Workspace =>
	effectiveWorkspace({
		companies: [{ uuid: "c-1", name: "Acme", permissions, branches }],
	});

type Unit = {
	uuid: string;
	name: string;
	status: "ACTIVE";
	permissions: Array<string>;
};

const unit = (uuid: string, name: string): Unit => ({
	uuid,
	name,
	status: "ACTIVE" as const,
	permissions: [],
});

/** Orchard (Kitchen, Bar) and Jurong (Floor) in Singapore, Kuala Lumpur (Office) in Malaysia. */
const company = workspace(
	[
		{
			...unit("b-1", "Orchard"),
			country: "SG",
			departments: [unit("d-1", "Kitchen"), unit("d-2", "Bar")],
		},
		{
			...unit("b-2", "Jurong"),
			country: "SG",
			departments: [unit("d-3", "Floor")],
		},
		{
			...unit("b-3", "Kuala Lumpur"),
			country: "MY",
			departments: [unit("d-4", "Office")],
		},
	],
	[PEOPLE_READ]
);

/** Holds the units as a page's URL would. */
const Page = ({
	initial,
	rules,
	onChange,
}: {
	initial: UnitSelection;
	rules: UnitSelectionRules;
	onChange: (next: UnitSelection) => void;
}): ReactElement => {
	const [requested, setRequested] = useState(initial);
	const selection = useUnitSelection("c-1", [PEOPLE_READ], requested, rules);
	return (
		<UnitSelector
			requested={requested}
			selection={selection}
			onChange={(next) => {
				onChange(next);
				setRequested(next);
			}}
		/>
	);
};

const renderWith = (
	data: Workspace,
	rules: UnitSelectionRules,
	initial: UnitSelection = {}
): { onChange: ReturnType<typeof vi.fn> } => {
	const client = new QueryClient();
	client.setQueryData(workspaceQuery.queryKey, data);
	const onChange = vi.fn();
	render(
		<I18nextProvider i18n={authTestI18n}>
			<QueryClientProvider client={client}>
				<Page initial={initial} rules={rules} onChange={onChange} />
			</QueryClientProvider>
		</I18nextProvider>
	);
	return { onChange };
};

describe("UnitSelector", () => {
	it("given_allBranchesAllowed_when_nothingIsChosen_then_showsAllAndWaitsForABranchBeforeDepartments", () => {
		const { onChange } = renderWith(company, TABLE);

		expect(screen.getByRole("button", { name: "Branch" })).toHaveTextContent(
			"All branches"
		);
		const department = screen.getByRole("button", { name: "Department" });
		expect(department).toBeDisabled();
		expect(department).toHaveAccessibleDescription("Choose a Branch first");
		expect(onChange).not.toHaveBeenCalled();
	});

	it("given_severalCountries_when_rendered_then_offersTheCountry", () => {
		renderWith(company, TABLE);

		expect(screen.getByRole("button", { name: "Country" })).toHaveTextContent(
			"All countries"
		);
	});

	it("given_aBranchIsChosen_when_aDepartmentIsChosen_then_reportsBoth", async () => {
		const user = userEvent.setup();
		const { onChange } = renderWith(company, TABLE, { branchId: "b-1" });

		await user.click(screen.getByRole("button", { name: "Department" }));
		await user.click(screen.getByRole("option", { name: "Bar" }));

		expect(onChange).toHaveBeenLastCalledWith({
			branchId: "b-1",
			departmentId: "d-2",
		});
	});

	it("given_aDepartmentIsChosen_when_theBranchChanges_then_clearsTheDepartment", async () => {
		const user = userEvent.setup();
		const { onChange } = renderWith(company, TABLE, {
			branchId: "b-1",
			departmentId: "d-2",
		});

		await user.click(screen.getByRole("button", { name: "Branch" }));
		await user.click(screen.getByRole("option", { name: "Jurong" }));

		expect(onChange).toHaveBeenLastCalledWith({ branchId: "b-2" });
	});

	it("given_aCountryIsChosen_when_changed_then_showsItsFirstBranch", async () => {
		const user = userEvent.setup();
		const { onChange } = renderWith(company, TABLE);

		await user.click(screen.getByRole("button", { name: "Country" }));
		await user.click(screen.getByRole("option", { name: "Malaysia" }));

		expect(onChange).toHaveBeenLastCalledWith({ branchId: "b-3" });
	});

	it("given_allBranchesNotAllowed_when_nothingIsChosen_then_announcesTheFirstBranchOnce", () => {
		const { onChange } = renderWith(company, GRID);

		expect(onChange).toHaveBeenCalledOnce();
		expect(onChange).toHaveBeenCalledWith({
			branchId: "b-3",
			departmentId: undefined,
		});
		expect(
			screen.queryByRole("option", { name: "All branches" })
		).not.toBeInTheDocument();
	});

	it("given_aPageStartingOnItsFirstBranch_when_allBranchesIsChosen_then_reportsItByItsUrlName", async () => {
		const user = userEvent.setup();
		const { onChange } = renderWith(company, FIRST_THEN_ALL);

		expect(onChange).toHaveBeenCalledWith({
			branchId: "b-3",
			departmentId: undefined,
		});
		await user.click(screen.getByRole("button", { name: "Branch" }));
		await user.click(screen.getByRole("option", { name: "All branches" }));

		expect(onChange).toHaveBeenLastCalledWith({ branchId: "all" });
		expect(screen.getByRole("button", { name: "Branch" })).toHaveTextContent(
			"All branches"
		);
	});

	it("given_aDepartmentOfAnotherBranch_when_rendered_then_announcesItCleared", () => {
		const { onChange } = renderWith(company, TABLE, {
			branchId: "b-1",
			departmentId: "d-3",
		});

		expect(onChange).toHaveBeenCalledWith({
			branchId: "b-1",
			departmentId: undefined,
		});
	});

	it("given_oneBranchAndOneDepartmentInReach_when_allIsNotAllowed_then_showsBothAsText", () => {
		renderWith(
			workspace([
				{
					...unit("b-2", "Jurong"),
					country: "SG",
					permissions: [PEOPLE_READ],
					departments: [unit("d-3", "Floor")],
				},
			]),
			GRID,
			{ branchId: "b-2" }
		);

		expect(screen.queryByRole("button")).not.toBeInTheDocument();
		expect(screen.getByText("Jurong")).toBeInTheDocument();
		expect(screen.getByText("Floor")).toBeInTheDocument();
	});

	it("given_noBranchInReach_when_rendered_then_rendersAndAnnouncesNothing", () => {
		const { onChange } = renderWith(workspace([]), TABLE);

		expect(screen.queryByText("Branch")).not.toBeInTheDocument();
		expect(onChange).not.toHaveBeenCalled();
	});
});
