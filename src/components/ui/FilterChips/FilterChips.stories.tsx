import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { FilterChips } from "@/components/ui/FilterChips";
import "@/common/i18n";

const meta = {
	title: "UI/FilterChips",
	component: FilterChips,
	parameters: { layout: "padded" },
	args: {
		chips: [
			{ key: "department", label: "Department: Kitchen", onRemove: fn() },
			{ key: "status", label: "Showing: Active", onRemove: fn() },
		],
		onClearAll: fn(),
	},
} satisfies Meta<typeof FilterChips>;

export default meta;

type Story = StoryObj<typeof meta>;

export const TwoSet: Story = {};

/** Nothing set: nothing rendered. */
export const NothingSet: Story = { args: { chips: [] } };
