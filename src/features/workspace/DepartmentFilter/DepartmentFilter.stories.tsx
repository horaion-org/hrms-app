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

/** Orchard's Departments, held as a page's URL would. */
const Harness = (): FunctionComponent => {
	const [departmentId, setDepartmentId] = useState<string>();
	const selection = useUnitSelection(
		"c-1",
		["member_profile:read"],
		{ branchId: "b-1", departmentId },
		{ allowAllBranches: true, withDepartment: true }
	);
	return <DepartmentFilter selection={selection} onChange={setDepartmentId} />;
};

const meta = {
	title: "Features/Workspace/DepartmentFilter",
	component: Harness,
	parameters: { layout: "padded" },
	decorators: [storyProviders(client)],
} satisfies Meta<typeof Harness>;

export default meta;

type Story = StoryObj<typeof meta>;

export const InOneBranch: Story = {};
