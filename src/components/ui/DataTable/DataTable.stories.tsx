import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { EditIcon } from "@/components/ui/Icon";
import { OverflowMenu, OverflowMenuItem } from "@/components/ui/OverflowMenu";
import "@/common/i18n";

type Branch = {
	id: string;
	name: string;
	code: string;
	city: string;
	active: boolean;
};

const branches: Array<Branch> = [
	{
		id: "b-1",
		name: "Main Branch",
		code: "0001",
		city: "Singapore",
		active: true,
	},
	{ id: "b-2", name: "Orchard", code: "0002", city: "Singapore", active: true },
	{ id: "b-3", name: "Jurong", code: "0003", city: "Singapore", active: false },
];

const columns: Array<DataTableColumn<Branch>> = [
	{
		id: "name",
		header: "Branch Name",
		cell: (branch) => branch.name,
		sortValue: (branch) => branch.name,
		cellClassName: "font-semibold",
	},
	{
		id: "code",
		header: "Code",
		cell: (branch) => branch.code,
		sortValue: (branch) => branch.code,
	},
	{ id: "city", header: "City", cell: (branch) => branch.city },
	{
		id: "status",
		header: "Status",
		cell: (branch) => (
			<Badge tone={branch.active ? "success" : "neutral"}>
				{branch.active ? "Active" : "Inactive"}
			</Badge>
		),
		sortValue: (branch) => (branch.active ? "ACTIVE" : "INACTIVE"),
		headerClassName: "w-30",
	},
	{
		id: "actions",
		header: "Actions",
		cell: (branch) => (
			<div className="flex items-center justify-center gap-1">
				<Button aria-label={`Edit ${branch.name}`} variant="icon">
					<EditIcon />
				</Button>
				<OverflowMenu label={`More actions for ${branch.name}`} variant="icon">
					<OverflowMenuItem>Edit</OverflowMenuItem>
					<OverflowMenuItem>Deactivate</OverflowMenuItem>
				</OverflowMenu>
			</div>
		),
		headerClassName: "w-35",
	},
];

const meta = {
	title: "UI/DataTable",
	component: DataTable<Branch>,
	parameters: { layout: "padded" },
	args: {
		label: "Branches",
		columns,
		data: branches,
		getRowId: (branch: Branch): string => branch.id,
		defaultSort: { id: "name", desc: false },
		onSortChange: fn(),
	},
	argTypes: {
		columns: { control: false },
		data: { control: false },
		getRowId: { control: false },
		emptyState: { control: "text" },
	},
} satisfies Meta<typeof DataTable<Branch>>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Sorted on the client from each column's `sortValue`. */
export const Default: Story = {};

export const Selectable: Story = {
	args: {
		selection: {
			rowLabel: (branch: Branch): string => branch.name,
			onChange: fn(),
		},
	},
};

export const Empty: Story = {
	args: {
		data: [],
		emptyState: "No branches yet.",
		selection: { rowLabel: (branch: Branch): string => branch.name },
	},
};
