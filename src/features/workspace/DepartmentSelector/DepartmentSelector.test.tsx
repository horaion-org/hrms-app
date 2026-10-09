import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it, vi } from "vitest";
import { authTestI18n } from "@/features/auth/testingI18n";
import { workspaceQuery, type Workspace } from "@/features/workspace/api";
import { DepartmentSelector } from "@/features/workspace/DepartmentSelector";

const CREATE = "job_title:create";

/** Kitchen and Bar at Orchard (SG), Kitchen at Bukit Bintang (MY); the key held where `held` names. */
const workspace = (
	held: ReadonlyArray<string>,
	companyPermissions: Array<string> = []
): Workspace => {
	const grant = (uuid: string): Array<string> =>
		held.includes(uuid) ? [CREATE] : [];
	return {
		companies: [
			{
				uuid: "c-1",
				name: "Acme",
				permissions: companyPermissions,
				branches: [
					{
						uuid: "b-1",
						name: "Orchard",
						status: "ACTIVE",
						country: "SG",
						permissions: grant("b-1"),
						departments: [
							{
								uuid: "d-1",
								name: "Kitchen",
								status: "ACTIVE",
								permissions: grant("d-1"),
							},
							{
								uuid: "d-2",
								name: "Bar",
								status: "ACTIVE",
								permissions: grant("d-2"),
							},
						],
					},
					{
						uuid: "b-2",
						name: "Bukit Bintang",
						status: "ACTIVE",
						country: "MY",
						permissions: grant("b-2"),
						departments: [
							{
								uuid: "d-3",
								name: "Kitchen",
								status: "ACTIVE",
								permissions: grant("d-3"),
							},
						],
					},
				],
			},
		],
	};
};

/** Renders the selector; without `data` the workspace is still loading. */
const renderWith = (
	data?: Workspace,
	value?: string,
	activeOnly = false
): { onChange: ReturnType<typeof vi.fn> } => {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	if (data) client.setQueryData(workspaceQuery.queryKey, data);
	else
		client.setQueryDefaults(workspaceQuery.queryKey, {
			queryFn: () => new Promise<never>(() => {}),
		});
	const onChange = vi.fn();
	render(
		<I18nextProvider i18n={authTestI18n}>
			<QueryClientProvider client={client}>
				<DepartmentSelector
					activeOnly={activeOnly}
					aria-label="Department"
					companyId="c-1"
					keys={[CREATE]}
					placeholder="Select department"
					value={value}
					onChange={onChange}
				/>
			</QueryClientProvider>
		</I18nextProvider>
	);
	return { onChange };
};

const optionLabels = async (
	user: ReturnType<typeof userEvent.setup>
): Promise<Array<string | null>> => {
	await user.click(screen.getByRole("button", { name: "Department" }));
	return screen.getAllByRole("option").map((option) => option.textContent);
};

describe("DepartmentSelector", () => {
	it("offers the Departments where the key is held, at the Department or its Branch", async () => {
		const user = userEvent.setup();
		renderWith(workspace(["d-2", "b-2"]));

		expect(await optionLabels(user)).toEqual([
			"Bukit Bintang › Kitchen",
			"Orchard › Bar",
		]);
	});

	it("names each Department with its Branch, sorted by country, Branch, then name", async () => {
		const user = userEvent.setup();
		renderWith(workspace([], [CREATE]));

		expect(await optionLabels(user)).toEqual([
			"Bukit Bintang › Kitchen",
			"Orchard › Bar",
			"Orchard › Kitchen",
		]);
	});

	it("chooses nothing for the caller, and reports the chosen Department's id", async () => {
		const user = userEvent.setup();
		const { onChange } = renderWith(workspace(["d-1"]));

		const button = screen.getByRole("button", { name: "Department" });
		expect(button).toHaveTextContent("Select department");
		expect(onChange).not.toHaveBeenCalled();
		await user.click(button);
		await user.click(screen.getByRole("option", { name: "Orchard › Kitchen" }));
		expect(onChange).toHaveBeenCalledExactlyOnceWith("d-1");
	});

	it("shows the chosen Department", () => {
		renderWith(workspace(["b-1"]), "d-2");

		expect(
			screen.getByRole("button", { name: "Department" })
		).toHaveTextContent("Orchard › Bar");
	});

	it("offers with activeOnly only ACTIVE Departments under ACTIVE Branches", async () => {
		const user = userEvent.setup();
		const data = workspace([], [CREATE]);
		const company = data.companies[0]!;
		// Bar is INACTIVE; Bukit Bintang is INACTIVE though its Kitchen is ACTIVE.
		renderWith(
			{
				companies: [
					{
						...company,
						branches: company.branches.map((branch) =>
							branch.uuid === "b-2"
								? { ...branch, status: "INACTIVE" }
								: {
										...branch,
										departments: branch.departments.map((department) =>
											department.uuid === "d-2"
												? { ...department, status: "INACTIVE" }
												: department
										),
									}
						),
					},
				],
			},
			undefined,
			true
		);

		expect(await optionLabels(user)).toEqual(["Orchard › Kitchen"]);
	});

	it("is disabled, showing the placeholder, while the workspace loads", () => {
		renderWith();

		const button = screen.getByRole("button", { name: "Department" });
		expect(button).toBeDisabled();
		expect(button).toHaveTextContent("Select department");
	});

	it("stays enabled with no options when no Department is offered", async () => {
		const user = userEvent.setup();
		renderWith(workspace([]));

		const button = screen.getByRole("button", { name: "Department" });
		expect(button).toBeEnabled();
		await user.click(button);
		expect(screen.queryAllByRole("option")).toEqual([]);
	});
});
