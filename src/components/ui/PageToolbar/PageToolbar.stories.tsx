import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { Select } from "@/components/forms/Select";
import { Button } from "@/components/ui/Button";
import { PlusIcon } from "@/components/ui/Icon";
import { PageToolbar } from "@/components/ui/PageToolbar";
import "@/common/i18n";

const meta = {
	title: "UI/PageToolbar",
	component: PageToolbar,
	parameters: { layout: "padded" },
	args: {
		label: "People list controls",
		scope: (
			<Select
				aria-label="Branch"
				className="w-full sm:w-44"
				options={[{ value: "", label: "All branches" }]}
				value=""
			/>
		),
		filters: (
			<Select
				aria-label="Showing"
				className="w-full sm:w-40"
				options={[{ value: "all", label: "All employees" }]}
				value="all"
			/>
		),
		actions: <Button leadingIcon={<PlusIcon />}>Add employee</Button>,
	},
} satisfies Meta<typeof PageToolbar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithClearFilters: Story = { args: { onClearFilters: fn() } };

export const ActionsOnly: Story = {
	args: { scope: undefined, filters: undefined },
};
