import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { fn, userEvent, within } from "storybook/test";
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

/** The caller owns the selection, e.g. to start with some rows already chosen. */
export const ControlledSelection: Story = {
	render: function ControlledSelectionStory(args) {
		const [selectedIds, setSelectedIds] = useState<Array<string>>(["b-1"]);
		return (
			<DataTable
				{...args}
				selection={{
					rowLabel: (branch: Branch): string => branch.name,
					selectedIds,
					onChange: setSelectedIds,
				}}
			/>
		);
	},
};

export const Empty: Story = {
	args: {
		data: [],
		emptyState: "No branches yet.",
		selection: { rowLabel: (branch: Branch): string => branch.name },
	},
};

/** Each sortable header's button opens a menu of both directions. */
export const SortMenu: Story = { args: { sortControl: "menu" } };

export const SortMenuOpen: Story = {
	args: { sortControl: "menu" },
	play: async ({ canvasElement }) => {
		await userEvent.click(
			within(canvasElement).getByRole("button", { name: "Sort by Branch Name" })
		);
	},
};

const [nameColumn, codeColumn, cityColumn, statusColumn, actionsColumn] =
	columns as [
		DataTableColumn<Branch>,
		DataTableColumn<Branch>,
		DataTableColumn<Branch>,
		DataTableColumn<Branch>,
		DataTableColumn<Branch>,
	];

/** Wide enough to scroll inside a narrow frame, with the name and actions pinned. */
const pinnedColumns: Array<DataTableColumn<Branch>> = [
	{ ...nameColumn, pin: "start", headerClassName: "w-48" },
	codeColumn,
	cityColumn,
	statusColumn,
	{ id: "country", header: "Country", cell: () => "Singapore" },
	{ id: "timeZone", header: "Time zone", cell: () => "Asia/Singapore" },
	{ ...actionsColumn, pin: "end" },
];

/** A 600 px frame, narrower than the table. */
const narrowFrame: Decorator = (Story) => (
	<div className="w-150">
		<Story />
	</div>
);

/**
 * From `md` up the name and actions stay in view while the rest scrolls; the
 * shadows show only while content is hidden beneath them.
 */
export const Pinned: Story = {
	args: {
		columns: pinnedColumns,
		className: "[&>table]:min-w-300",
		selection: { rowLabel: (branch: Branch): string => branch.name },
	},
	decorators: [narrowFrame],
};

export const PinnedScrolled: Story = {
	...Pinned,
	play: ({ canvasElement }) => {
		within(canvasElement)
			.getByRole("table")
			.parentElement?.scrollTo({ left: 200 });
	},
};
