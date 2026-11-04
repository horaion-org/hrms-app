import { QueryClient } from "@tanstack/react-query";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import type { FunctionComponent } from "@/common/types";
import { effectiveWorkspace } from "@/common/testing/effectiveWorkspace";
import { AppHeader } from "@/components/layout/AppHeader";
import { storyProviders } from "@/features/organisation/storyApi";
import { workspaceQuery, type Workspace } from "@/features/workspace/api";
import { HeaderBranchScope } from "@/features/workspace/HeaderBranchScope";
import { useUnitSelection } from "@/features/workspace/useUnitSelection";

const branch = (
	uuid: string,
	name: string,
	country: string
): Workspace["companies"][number]["branches"][number] => ({
	uuid,
	name,
	status: "ACTIVE",
	country,
	permissions: [],
	departments: [],
});

const client = new QueryClient({
	defaultOptions: { queries: { retry: false, staleTime: Infinity } },
});
client.setQueryData(
	workspaceQuery.queryKey,
	effectiveWorkspace({
		companies: [
			{
				uuid: "one-country",
				name: "One country",
				permissions: ["member_profile:read"],
				branches: [
					branch("b-1", "Orchard", "SG"),
					branch("b-2", "Jurong", "SG"),
				],
			},
			{
				uuid: "one-branch",
				name: "One branch",
				permissions: ["member_profile:read"],
				branches: [branch("b-2", "Jurong", "SG")],
			},
			{
				uuid: "several",
				name: "Several countries",
				permissions: ["member_profile:read"],
				branches: [
					branch("b-1", "Orchard", "SG"),
					branch("b-3", "Kuala Lumpur", "MY"),
				],
			},
		],
	})
);

type StoryArgs = { companyId: string };

/** The control at the right of the app header, holding its choice as the URL would. */
const Harness = ({ companyId }: StoryArgs): FunctionComponent => {
	const [branchId, setBranchId] = useState<string>();
	const selection = useUnitSelection(
		companyId,
		["member_profile:read"],
		{ branchId },
		{ withDepartment: false }
	);
	return (
		<AppHeader
			title="Welcome, John."
			actions={
				<HeaderBranchScope selection={selection} onChange={setBranchId} />
			}
		/>
	);
};

const meta = {
	title: "Features/Workspace/HeaderBranchScope",
	component: Harness,
	parameters: { layout: "fullscreen" },
	args: { companyId: "one-country" },
	decorators: [storyProviders(client)],
} satisfies Meta<typeof Harness>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Several Branches: the first by name (or the home Branch) by default, "All branches" last. */
export const SeveralBranches: Story = {};

/** Branches in several countries, grouped under each country's name. */
export const SeveralCountries: Story = { args: { companyId: "several" } };

/** One Branch in reach reads as text, with no "All branches". */
export const OneBranch: Story = { args: { companyId: "one-branch" } };
