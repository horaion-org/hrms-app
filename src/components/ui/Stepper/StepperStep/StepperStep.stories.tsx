import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactElement } from "react";
import { Stepper, StepperStep } from "@/components/ui/Stepper";

const meta = {
	title: "UI/Stepper/StepperStep",
	component: StepperStep,
	parameters: { layout: "padded" },
	argTypes: { label: { control: "text" } },
	args: { label: "Setup" },
	render: (args): ReactElement => (
		<Stepper currentStep={0}>
			<StepperStep {...args} />
			<StepperStep label="Shifts" />
		</Stepper>
	),
} satisfies Meta<typeof StepperStep>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Current: Story = {};

export const Upcoming: Story = {
	args: { label: "Shifts" },
	render: (args): ReactElement => (
		<Stepper currentStep={0}>
			<StepperStep label="Setup" />
			<StepperStep {...args} />
		</Stepper>
	),
};
