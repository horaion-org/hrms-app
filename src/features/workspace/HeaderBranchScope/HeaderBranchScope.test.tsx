import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it, vi } from "vitest";
import { effectiveWorkspace } from "@/common/testing/effectiveWorkspace";
import { authTestI18n } from "@/features/auth/testingI18n";
import { workspaceQuery, type Workspace } from "@/features/workspace/api";
import { HeaderBranchScope } from "@/features/workspace/HeaderBranchScope";
import { myProfileQuery } from "@/features/people/api";
import type {
	UnitSelection,
	UnitSelectionRules,
} from "@/features/workspace/unitSelection";
import { useUnitSelection } from "@/features/workspace/useUnitSelection";

const PEOPLE_READ = "member_profile:read";
const RULES: UnitSelectionRules = { withDepartment: false };

type Branch = Workspace["companies"][number]["branches"][number];

const branch = (uuid: string, name: string, country: string): Branch => ({
	uuid,
	name,
	status: "ACTIVE",
	country,
	permissions: [],
	departments: [],
});

const workspaceOf = (branches: Array<Branch>): Workspace =>
	effectiveWorkspace({
		companies: [
			{ uuid: "c-1", name: "Acme", permissions: [PEOPLE_READ], branches },
		],
	});

/** Resolves the page's Branch as the header does, then shows the control. */
const Header = ({
	requested,
	rules,
	onChange,
}: {
	requested: UnitSelection;
	rules: UnitSelectionRules;
	onChange: (branchId: string) => void;
}): ReactElement => {
	const selection = useUnitSelection("c-1", [PEOPLE_READ], requested, rules);
	return <HeaderBranchScope selection={selection} onChange={onChange} />;
};

const renderWith = (
	branches: Array<Branch>,
	requested: UnitSelection = {},
	homeBranchId?: string
): { onChange: ReturnType<typeof vi.fn> } => {
	const client = new QueryClient();
	client.setQueryData(workspaceQuery.queryKey, workspaceOf(branches));
	if (homeBranchId)
		client.setQueryData(myProfileQuery("c-1").queryKey, {
			branchId: homeBranchId,
		});
	const onChange = vi.fn();
	render(
		<I18nextProvider i18n={authTestI18n}>
			<QueryClientProvider client={client}>
				<Header requested={requested} rules={RULES} onChange={onChange} />
			</QueryClientProvider>
		</I18nextProvider>
	);
	return { onChange };
};

const singapore = [
	branch("b-1", "Orchard", "SG"),
	branch("b-2", "Jurong", "SG"),
];

describe("HeaderBranchScope", () => {
	it("given_nothingChosen_when_rendered_then_showsTheFirstBranchByNameUnderABranchLabel", () => {
		renderWith(singapore);

		expect(screen.getByText("Branch")).toBeVisible();
		expect(screen.getByRole("button", { name: "Branch" })).toHaveTextContent(
			"Jurong"
		);
	});

	it("given_aHomeBranch_when_nothingIsChosen_then_showsTheHomeBranch", () => {
		renderWith(singapore, {}, "b-1");

		expect(screen.getByRole("button", { name: "Branch" })).toHaveTextContent(
			"Orchard"
		);
	});

	it("given_severalBranches_when_opened_then_listsThemWithAllBranchesLast", async () => {
		const user = userEvent.setup();
		renderWith(singapore);

		await user.click(screen.getByRole("button", { name: "Branch" }));

		expect(
			screen.getAllByRole("option").map((option) => option.textContent)
		).toEqual(["Jurong", "Orchard", "All branches"]);
	});

	it("given_aBranchIsChosen_when_changed_then_reportsItsId", async () => {
		const user = userEvent.setup();
		const { onChange } = renderWith(singapore);

		await user.click(screen.getByRole("button", { name: "Branch" }));
		await user.click(screen.getByRole("option", { name: "Orchard" }));

		expect(onChange).toHaveBeenCalledWith("b-1");
	});

	it("given_allBranches_when_chosen_then_reportsItByItsUrlName", async () => {
		const user = userEvent.setup();
		const { onChange } = renderWith(singapore, { branchId: "b-1" });

		await user.click(screen.getByRole("button", { name: "Branch" }));
		await user.click(screen.getByRole("option", { name: "All branches" }));

		expect(onChange).toHaveBeenCalledWith("all");
	});

	it("given_allBranchesInTheUrl_when_rendered_then_showsIt", () => {
		renderWith(singapore, { branchId: "all" });

		expect(screen.getByRole("button", { name: "Branch" })).toHaveTextContent(
			"All branches"
		);
	});

	it("given_branchesInSeveralCountries_when_opened_then_groupsThemByCountry", async () => {
		const user = userEvent.setup();
		renderWith([...singapore, branch("b-3", "Kuala Lumpur", "MY")]);

		await user.click(screen.getByRole("button", { name: "Branch" }));

		expect(
			within(screen.getByRole("group", { name: "Malaysia" })).getByRole(
				"option",
				{ name: "Kuala Lumpur" }
			)
		).toBeVisible();
		expect(
			within(screen.getByRole("group", { name: "Singapore" })).getAllByRole(
				"option"
			)
		).toHaveLength(2);
	});

	it("given_oneBranchInReach_when_rendered_then_readsAsTextWithoutAll", () => {
		renderWith([branch("b-2", "Jurong", "SG")], { branchId: "all" });

		expect(screen.queryByRole("button")).not.toBeInTheDocument();
		expect(screen.getByText("Jurong")).toBeVisible();
	});
});
