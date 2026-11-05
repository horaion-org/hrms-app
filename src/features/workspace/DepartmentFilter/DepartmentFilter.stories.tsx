import { QueryClient } from "@tanstack/react-query";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import type { FunctionComponent } from "@/common/types";
import { companyWideWorkspace } from "@/common/testing/effectiveWorkspace";
import { storyProviders } from "@/features/organisation/storyApi";
import { workspaceQuery } from "@/features/workspace/api";
import { DepartmentFilter } from "@/features/workspace/DepartmentFilter";
import { useUnitSelection } from "@/features/workspace/useUnitSelection";

const client = new QueryClient({
	defaultOptions: { queries: { retry: false, staleTime: Infinity } },
});
client.setQueryData(
	workspaceQuery.queryKey,
	companyWideWorkspace(["member_profile:read"])
);

type StoryArgs = {
	/** The header's Branch: an id, or "all" for every Branch. */
	branchId: string;
};

/** The Departments of the header's Branch, held as a page's URL would. */
const Harness = ({ branchId }: StoryArgs): FunctionComponent => {
	const [departmentId, setDepartmentId] = useState<string>();
	const selection = useUnitSelection(
		"c-1",
		["member_profile:read"],
		{ branchId, departmentId },
		{ withDepartment: true }
	);
	return <DepartmentFilter selection={selection} onChange={setDepartmentId} />;
};

const meta = {
	title: "Features/Workspace/DepartmentFilter",
	component: Harness,
	parameters: { layout: "padded" },
	args: { branchId: "b-1" },
	decorators: [storyProviders(client)],
} satisfies Meta<typeof Harness>;

export default meta;

type Story = StoryObj<typeof meta>;

/** One Branch: only its Departments, without headings. */
export const InOneBranch: Story = {};

/** All branches: every Department in reach, under its Branch's name. */
export const InAllBranches: Story = { args: { branchId: "all" } };
