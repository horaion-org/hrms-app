import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { fn } from "storybook/test";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import { ListToolbar } from "@/features/organisation/ListToolbar";
import "@/common/i18n";

const statusOptions = [
	{ value: "all", label: "All Branches" },
	{ value: "ACTIVE", label: "Active" },
	{ value: "INACTIVE", label: "Inactive" },
];

const meta = {
	title: "Features/Organisation/ListToolbar",
	component: ListToolbar,
	parameters: { layout: "padded" },
	args: {
		searchLabel: "Search Branch",
		search: "",
		onSearchChange: fn(),
		createLabel: "Create Branch",
		onCreate: fn(),
		filter: {
			label: "Showing:",
			value: "all",
			options: statusOptions,
			onChange: fn(),
		},
	},
	argTypes: { filter: { control: false } },
	render: function Controlled(args): NonNullable<FunctionComponent> {
		const [search, setSearch] = useState(args.search);
		const [status, setStatus] = useState(args.filter?.value ?? "all");
		return (
			<ListToolbar
				{...args}
				search={search}
				filter={
					args.filter && {
						...args.filter,
						value: status,
						onChange: setStatus,
					}
				}
				onSearchChange={setSearch}
			/>
		);
	},
} satisfies Meta<typeof ListToolbar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** People adds Import and Export before its primary action. */
export const WithActions: Story = {
	args: {
		actions: (
			<>
				<Button variant="secondary">Import</Button>
				<Button variant="secondary">Export</Button>
			</>
		),
	},
};

/** System Roles has no status, so its list shows no filter. */
export const WithoutFilter: Story = {
	args: {
		searchLabel: "Search System Role",
		createLabel: "Create Role",
		filter: undefined,
	},
};

/** People ticks each status on its own; both, like neither, shows everyone. */
export const MultipleFilter: Story = {
	args: {
		searchLabel: "Search employee",
		createLabel: undefined,
		onCreate: undefined,
		filter: undefined,
		multipleFilter: {
			label: "Showing:",
			value: ["ACTIVE", "INACTIVE"],
			options: statusOptions.slice(1),
			placeholder: "All employees",
			formatSummary: () => "All employees",
			onChange: fn(),
		},
	},
	argTypes: { multipleFilter: { control: false } },
	render: function ControlledMultiple(args): NonNullable<FunctionComponent> {
		const [statuses, setStatuses] = useState(args.multipleFilter?.value ?? []);
		return (
			<ListToolbar
				{...args}
				multipleFilter={
					args.multipleFilter && {
						...args.multipleFilter,
						value: statuses,
						onChange: setStatuses,
					}
				}
			/>
		);
	},
};
