import { QueryClient } from "@tanstack/react-query";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import type { FunctionComponent } from "@/common/types";
import { storyProviders } from "@/features/organisation/storyApi";
import { effectiveWorkspace } from "@/common/testing/effectiveWorkspace";
import { workspaceQuery, type Workspace } from "@/features/workspace/api";
import { DepartmentSelector } from "@/features/workspace/DepartmentSelector";

type Branch = Workspace["companies"][number]["branches"][number];

const branch = (
	uuid: string,
	name: string,
	departments: Array<string>
): Branch => ({
	uuid,
	name,
	status: "ACTIVE",
	country: "SG",
	permissions: [],
	departments: departments.map((department) => ({
		uuid: `${uuid}-${department}`,
		name: department,
		status: "ACTIVE",
		permissions: [],
	})),
});

/** One company per story, each holding the key company-wide. */
const company = (
	uuid: string,
	branches: Array<Branch>
): Workspace["companies"][number] => ({
	uuid,
	name: uuid,
	permissions: ["job_title:create"],
	branches,
});

const loaded = new QueryClient({
	defaultOptions: { queries: { retry: false, staleTime: Infinity } },
});
loaded.setQueryData(
	workspaceQuery.queryKey,
	effectiveWorkspace({
		companies: [
			company("several", [
				branch("b-1", "Orchard", ["Kitchen", "Bar", "Front of house"]),
				branch("b-2", "Jurong", ["Kitchen", "Delivery"]),
			]),
			company("none", []),
		],
	})
);

/** A workspace that never arrives. */
const loading = new QueryClient({
	defaultOptions: { queries: { retry: false } },
});
loading.setQueryDefaults(workspaceQuery.queryKey, {
	queryFn: () => new Promise<never>(() => {}),
});

const meta = {
	title: "Features/Workspace/DepartmentSelector",
	component: DepartmentSelector,
	parameters: { layout: "padded" },
	args: {
		companyId: "several",
		keys: ["job_title:create"],
		placeholder: "Select department",
		"aria-label": "Department",
		className: "w-72",
		onChange: (): void => {},
	},
	decorators: [storyProviders(loaded)],
	render: function Render(args): NonNullable<FunctionComponent> {
		const [value, setValue] = useState(args.value);
		return <DepartmentSelector {...args} value={value} onChange={setValue} />;
	},
} satisfies Meta<typeof DepartmentSelector>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Departments across two Branches, each named with its Branch. */
export const SeveralDepartments: Story = {};

/** The workspace is still loading: disabled, showing the placeholder. */
export const Loading: Story = { decorators: [storyProviders(loading)] };

/** No Department offered: enabled with no options, the page explains. */
export const NoneOffered: Story = { args: { companyId: "none" } };
