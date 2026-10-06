import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "@/components/ui/Button";
import { PlusIcon } from "@/components/ui/Icon";
import { StepPanel } from "@/features/scheduling/StepPanel";

const meta = {
	title: "Features/Scheduling/StepPanel",
	component: StepPanel,
	parameters: { layout: "padded" },
	args: {
		title: "Select Shifts",
		description: "Choose the shifts to include in this schedule.",
	},
} satisfies Meta<typeof StepPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithActions: Story = {
	args: {
		actions: (
			<Button leadingIcon={<PlusIcon />} size="sm">
				Add Custom Shift
			</Button>
		),
	},
};
