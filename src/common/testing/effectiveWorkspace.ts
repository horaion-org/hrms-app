import type { Workspace } from "@/features/workspace/api";

/**
 * Applies the API's workspace rule to a fixture: a company grant is
 * effective at every Branch and Department, and a Branch grant at its
 * Departments. The real API sends nodes this way, so fixtures written as
 * "granted at" read the same as what the app receives. Only for tests.
 */
export const effectiveWorkspace = (workspace: Workspace): Workspace => ({
	companies: workspace.companies.map((company) => ({
		...company,
		branches: company.branches.map((branch) => {
			const atBranch = [
				...new Set([...company.permissions, ...branch.permissions]),
			];
			return {
				...branch,
				permissions: atBranch,
				departments: branch.departments.map((department) => ({
					...department,
					permissions: [...new Set([...atBranch, ...department.permissions])],
				})),
			};
		}),
	})),
});

type Branches = Workspace["companies"][number]["branches"];

/**
 * Orchard (`b-1`, with Kitchen `d-1` and Bar `d-2`) and Tampines (`b-2`,
 * with Front `d-3`): the live units a test's lists name, which the real
 * workspace always lists.
 */
export const TEST_BRANCHES: Branches = [
	{
		uuid: "b-1",
		name: "Orchard",
		status: "ACTIVE",
		country: "SG",
		permissions: [],
		departments: [
			{ uuid: "d-1", name: "Kitchen", status: "ACTIVE", permissions: [] },
			{ uuid: "d-2", name: "Bar", status: "ACTIVE", permissions: [] },
		],
	},
	{
		uuid: "b-2",
		name: "Tampines",
		status: "ACTIVE",
		country: "SG",
		permissions: [],
		departments: [
			{ uuid: "d-3", name: "Front", status: "ACTIVE", permissions: [] },
		],
	},
];

/** A workspace for company `c-1` granting `permissions` company-wide, effective at every unit. */
export const companyWideWorkspace = (
	permissions: ReadonlyArray<string>,
	branches: Branches = TEST_BRANCHES
): Workspace =>
	effectiveWorkspace({
		companies: [
			{
				uuid: "c-1",
				name: "Company c-1",
				permissions: [...permissions],
				branches,
			},
		],
	});
