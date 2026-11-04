import type { Meta, StoryObj } from "@storybook/react-vite";
import { FormRow } from "@/components/forms/FormRow";
import { Select } from "@/components/forms/Select";
import { FiltersPopover } from "@/components/ui/FiltersPopover";
import "@/common/i18n";

const meta = {
	title: "UI/FiltersPopover",
	component: FiltersPopover,
	parameters: { layout: "padded" },
	args: {
		count: 0,
		children: (
			<FormRow htmlFor="story-showing" label="Showing" layout="stacked">
				<Select
					aria-label="Showing"
					className="w-full font-semibold"
					value="all"
					options={[
						{ value: "all", label: "All employees" },
						{ value: "ACTIVE", label: "Active" },
					]}
				/>
			</FormRow>
		),
	},
} satisfies Meta<typeof FiltersPopover>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Nothing set: only the button. */
export const NothingSet: Story = {};

/** Two filters set: the button counts them. */
export const TwoSet: Story = { args: { count: 2 } };
