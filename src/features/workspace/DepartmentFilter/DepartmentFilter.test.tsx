import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it, vi } from "vitest";
import { companyWideWorkspace } from "@/common/testing/effectiveWorkspace";
import { authTestI18n } from "@/features/auth/testingI18n";
import { workspaceQuery } from "@/features/workspace/api";
import { DepartmentFilter } from "@/features/workspace/DepartmentFilter";
import type { UnitSelection } from "@/features/workspace/unitSelection";
import { useUnitSelection } from "@/features/workspace/useUnitSelection";

const READ = "member_profile:read";

const Field = ({
	requested,
	onChange,
}: {
	requested: UnitSelection;
	onChange: (departmentId: string | undefined) => void;
}): ReactElement => {
	const selection = useUnitSelection("c-1", [READ], requested, {
		withDepartment: true,
	});
	return <DepartmentFilter selection={selection} onChange={onChange} />;
};

/** Orchard (Kitchen d-1, Bar d-2) and Tampines (Front d-3), all in scope. */
const renderWith = (
	requested: UnitSelection
): { onChange: ReturnType<typeof vi.fn> } => {
	const client = new QueryClient();
	client.setQueryData(workspaceQuery.queryKey, companyWideWorkspace([READ]));
	const onChange = vi.fn();
	render(
		<I18nextProvider i18n={authTestI18n}>
			<QueryClientProvider client={client}>
				<Field requested={requested} onChange={onChange} />
			</QueryClientProvider>
		</I18nextProvider>
	);
	return { onChange };
};

describe("DepartmentFilter", () => {
	it("given_allBranches_when_opened_then_offersEveryDepartmentUnderItsBranch", async () => {
		const user = userEvent.setup();
		const { onChange } = renderWith({ branchId: "all" });

		await user.click(screen.getByRole("button", { name: "Department" }));

		expect(
			within(screen.getByRole("group", { name: "Orchard" }))
				.getAllByRole("option")
				.map((option) => option.textContent)
		).toEqual(["Bar", "Kitchen"]);
		await user.click(
			within(screen.getByRole("group", { name: "Tampines" })).getByRole(
				"option",
				{ name: "Front" }
			)
		);
		expect(onChange).toHaveBeenCalledWith("d-3");
	});

	it("given_oneBranch_when_opened_then_offersOnlyItsDepartmentsWithoutGroups", async () => {
		const user = userEvent.setup();
		renderWith({ branchId: "b-1" });

		await user.click(screen.getByRole("button", { name: "Department" }));

		expect(
			within(screen.getByRole("listbox")).queryByRole("group")
		).not.toBeInTheDocument();
		expect(
			screen.getAllByRole("option").map((option) => option.textContent)
		).toEqual(["All departments", "Bar", "Kitchen"]);
	});

	it("given_oneBranchWithSeveralDepartments_when_oneIsChosen_then_reportsIt", async () => {
		const user = userEvent.setup();
		const { onChange } = renderWith({ branchId: "b-1" });

		const field = screen.getByRole("button", { name: "Department" });
		expect(field).toHaveTextContent("All departments");
		await user.click(field);
		await user.click(screen.getByRole("option", { name: "Bar" }));

		expect(onChange).toHaveBeenCalledWith("d-2");
	});

	it("given_aChosenDepartment_when_allIsChosen_then_reportsNone", async () => {
		const user = userEvent.setup();
		const { onChange } = renderWith({ branchId: "b-1", departmentId: "d-2" });

		await user.click(screen.getByRole("button", { name: "Department" }));
		await user.click(screen.getByRole("option", { name: "All departments" }));

		expect(onChange).toHaveBeenCalledWith(undefined);
	});

	it("given_oneDepartmentInTheBranch_when_rendered_then_offersNothingToChoose", () => {
		renderWith({ branchId: "b-2" });

		expect(
			screen.queryByRole("button", { name: "Department" })
		).not.toBeInTheDocument();
	});
});
