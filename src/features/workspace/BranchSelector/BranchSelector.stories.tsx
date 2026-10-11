import { QueryClient } from "@tanstack/react-query";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import type { FunctionComponent } from "@/common/types";
import { storyProviders } from "@/features/organisation/storyApi";
import { effectiveWorkspace } from "@/common/testing/effectiveWorkspace";
import { workspaceQuery, type Workspace } from "@/features/workspace/api";
import { BranchSelector } from "@/features/workspace/BranchSelector";

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

/** One company per story, each holding the key company-wide. */
const company = (
	uuid: string,
	branches: Workspace["companies"][number]["branches"]
): Workspace["companies"][number] => ({
	uuid,
	name: uuid,
	permissions: ["leave_request:read"],
	branches,
});

const client = new QueryClient({
	defaultOptions: { queries: { retry: false, staleTime: Infinity } },
});
client.setQueryData(
	workspaceQuery.queryKey,
	effectiveWorkspace({
		companies: [
			company("several", [
				branch("b-1", "Orchard", "SG"),
				branch("b-2", "Jurong", "SG"),
				branch("b-3", "Kuala Lumpur", "MY"),
				branch("b-4", "Jakarta", "ID"),
			]),
			company("one", [
				branch("b-5", "Orchard", "SG"),
				branch("b-6", "Tampines", "SG"),
			]),
			company("none", []),
		],
	})
);

const meta = {
	title: "Features/Workspace/BranchSelector",
	component: BranchSelector,
	parameters: { layout: "padded" },
	args: {
		companyId: "several",
		keys: ["leave_request:read"],
		onChange: (): void => {},
	},
	decorators: [storyProviders(client)],
	render: function Render(args): NonNullable<FunctionComponent> {
		const [value, setValue] = useState(args.value);
		return <BranchSelector {...args} value={value} onChange={setValue} />;
	},
} satisfies Meta<typeof BranchSelector>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Branches in several countries: a Country select, then that country's Branches. */
export const SeveralCountries: Story = {};

/** Every Branch in one country: only the Branch select. */
export const OneCountry: Story = { args: { companyId: "one" } };

/** "All branches" and "All countries" offered first, and the default. */
export const AllowAll: Story = { args: { allowAll: true } };

/** No Branch offered: nothing is rendered, the page explains. */
export const NoBranches: Story = { args: { companyId: "none" } };
