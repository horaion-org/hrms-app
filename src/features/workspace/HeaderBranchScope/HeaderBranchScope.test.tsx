import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it, vi } from "vitest";
import { effectiveWorkspace } from "@/common/testing/effectiveWorkspace";
import { authTestI18n } from "@/features/auth/testingI18n";
import { workspaceQuery, type Workspace } from "@/features/workspace/api";
import { HeaderBranchScope } from "@/features/workspace/HeaderBranchScope";
import type {
	UnitSelection,
	UnitSelectionRules,
} from "@/features/workspace/unitSelection";
import { useUnitSelection } from "@/features/workspace/useUnitSelection";

const PEOPLE_READ = "member_profile:read";
const LIST: UnitSelectionRules = {
	allowAllBranches: true,
	withDepartment: false,
};
const PINNED: UnitSelectionRules = {
	allowAllBranches: false,
	withDepartment: false,
};

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
	rules: UnitSelectionRules,
	requested: UnitSelection = {}
): { onChange: ReturnType<typeof vi.fn> } => {
	const client = new QueryClient();
	client.setQueryData(workspaceQuery.queryKey, workspaceOf(branches));
	const onChange = vi.fn();
	render(
		<I18nextProvider i18n={authTestI18n}>
			<QueryClientProvider client={client}>
				<Header requested={requested} rules={rules} onChange={onChange} />
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
	it("given_aListPage_when_nothingIsChosen_then_showsAllBranchesUnderABranchLabel", () => {
		renderWith(singapore, LIST);

		expect(screen.getByText("Branch")).toBeVisible();
		expect(screen.getByRole("button", { name: "Branch" })).toHaveTextContent(
			"All branches"
		);
	});

	it("given_aBranchIsChosen_when_changed_then_reportsItsId", async () => {
		const user = userEvent.setup();
		const { onChange } = renderWith(singapore, LIST);

		await user.click(screen.getByRole("button", { name: "Branch" }));
		await user.click(screen.getByRole("option", { name: "Orchard" }));

		expect(onChange).toHaveBeenCalledWith("b-1");
	});

	it("given_allBranches_when_chosen_then_reportsItByItsUrlName", async () => {
		const user = userEvent.setup();
		const { onChange } = renderWith(singapore, LIST, { branchId: "b-1" });

		await user.click(screen.getByRole("button", { name: "Branch" }));
		await user.click(screen.getByRole("option", { name: "All branches" }));

		expect(onChange).toHaveBeenCalledWith("all");
	});

	it("given_branchesInSeveralCountries_when_opened_then_namesEachWithItsCountry", async () => {
		const user = userEvent.setup();
		renderWith([...singapore, branch("b-3", "Kuala Lumpur", "MY")], LIST);

		await user.click(screen.getByRole("button", { name: "Branch" }));

		expect(
			screen.getByRole("option", { name: "Malaysia › Kuala Lumpur" })
		).toBeVisible();
		expect(
			screen.getByRole("option", { name: "Singapore › Orchard" })
		).toBeVisible();
	});

	it("given_aPageShowingOneBranch_when_allIsInTheUrl_then_showsItsFirstBranchWithoutAll", async () => {
		const user = userEvent.setup();
		renderWith(singapore, PINNED, { branchId: "all" });

		const control = screen.getByRole("button", { name: "Branch" });
		expect(control).toHaveTextContent("Jurong");
		await user.click(control);
		expect(
			screen.queryByRole("option", { name: "All branches" })
		).not.toBeInTheDocument();
	});

	it("given_oneBranchAPageMustShow_when_rendered_then_readsAsText", () => {
		renderWith([branch("b-2", "Jurong", "SG")], PINNED);

		expect(screen.queryByRole("button")).not.toBeInTheDocument();
		expect(screen.getByText("Jurong")).toBeVisible();
	});
});
