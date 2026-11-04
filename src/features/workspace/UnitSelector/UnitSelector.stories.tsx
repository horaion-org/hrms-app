import { QueryClient } from "@tanstack/react-query";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import type { FunctionComponent } from "@/common/types";
import { effectiveWorkspace } from "@/common/testing/effectiveWorkspace";
import { PageToolbar } from "@/components/ui/PageToolbar";
import { storyProviders } from "@/features/organisation/storyApi";
import { workspaceQuery, type Workspace } from "@/features/workspace/api";
import { UnitSelector } from "@/features/workspace/UnitSelector";
import type {
	UnitSelection,
	UnitSelectionRules,
} from "@/features/workspace/unitSelection";
import { useUnitSelection } from "@/features/workspace/useUnitSelection";

type Branch = Workspace["companies"][number]["branches"][number];

const branch = (
	uuid: string,
	name: string,
	country: string,
	departments: Array<string>
): Branch => ({
	uuid,
	name,
	status: "ACTIVE",
	country,
	permissions: [],
	departments: departments.map((departmentName, index) => ({
		uuid: `${uuid}-d-${index}`,
		name: departmentName,
		status: "ACTIVE",
		permissions: [],
	})),
});

const client = new QueryClient({
	defaultOptions: { queries: { retry: false, staleTime: Infinity } },
});
client.setQueryData(
	workspaceQuery.queryKey,
	effectiveWorkspace({
		companies: [
			{
				uuid: "several",
				name: "Several",
				permissions: ["member_profile:read"],
				branches: [
					branch("b-1", "Orchard", "SG", ["Kitchen", "Bar"]),
					branch("b-2", "Jurong", "SG", ["Floor"]),
					branch("b-3", "Kuala Lumpur", "MY", ["Office"]),
				],
			},
			{
				uuid: "one",
				name: "One",
				permissions: ["member_profile:read"],
				branches: [branch("b-4", "Tampines", "SG", ["Front"])],
			},
		],
	})
);

type StoryArgs = { companyId: string; rules: UnitSelectionRules };

/** A page holding the units as its URL would, inside a toolbar's scope zone. */
const Harness = ({ companyId, rules }: StoryArgs): FunctionComponent => {
	const [requested, setRequested] = useState<UnitSelection>({});
	const selection = useUnitSelection(
		companyId,
		["member_profile:read"],
		requested,
		rules
	);
	return (
		<PageToolbar
			label="List controls"
			scope={
				<UnitSelector
					requested={requested}
					selection={selection}
					onChange={setRequested}
				/>
			}
		/>
	);
};

const meta = {
	title: "Features/Workspace/UnitSelector",
	component: Harness,
	parameters: { layout: "padded" },
	args: {
		companyId: "several",
		rules: { allowAllBranches: true, withDepartment: true },
	},
	decorators: [storyProviders(client)],
} satisfies Meta<typeof Harness>;

export default meta;

type Story = StoryObj<typeof meta>;

/** A table view: "All branches" first and the default; Department waits for a Branch. */
export const AllBranchesAllowed: Story = {};

/** A grid view: the first Branch is shown and there is no "All branches". */
export const OneBranchPinned: Story = {
	args: { rules: { allowAllBranches: false, withDepartment: true } },
};

/** One Branch with one Department in reach: both shown as text. */
export const SingleUnitInReach: Story = {
	args: {
		companyId: "one",
		rules: { allowAllBranches: false, withDepartment: true },
	},
};

/** A Branch-only list, such as Departments. */
export const BranchOnly: Story = {
	args: { rules: { allowAllBranches: true, withDepartment: false } },
};
