import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { fn } from "storybook/test";
import type { FunctionComponent } from "@/common/types";
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

/** System Roles has no status, so its list shows no filter. */
export const WithoutFilter: Story = {
	args: {
		searchLabel: "Search System Role",
		createLabel: "Create Role",
		filter: undefined,
	},
};
