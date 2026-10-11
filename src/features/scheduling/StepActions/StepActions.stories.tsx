import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { ArrowRightIcon, GenerateScheduleIcon } from "@/components/ui/Icon";
import { StepActions } from "@/features/scheduling/StepActions";
import "@/common/i18n";

const meta = {
	title: "Features/Scheduling/StepActions",
	component: StepActions,
	parameters: { layout: "padded" },
	args: {
		nextLabel: "Next",
		nextIcon: <ArrowRightIcon />,
		unavailableNote: "Generating schedules isn’t available yet.",
		onNext: fn(),
	},
} satisfies Meta<typeof StepActions>;

export default meta;

type Story = StoryObj<typeof meta>;

export const FirstStep: Story = {};

export const MiddleStep: Story = {
	args: { onBack: fn(), onSaveDraft: fn() },
};

export const Saving: Story = {
	args: { onBack: fn(), onSaveDraft: fn(), busy: true },
};

export const LastStep: Story = {
	args: {
		onBack: fn(),
		onSaveDraft: fn(),
		nextLabel: "Generate",
		nextIcon: <GenerateScheduleIcon />,
		nextDisabled: true,
	},
};
