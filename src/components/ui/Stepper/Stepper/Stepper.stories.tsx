import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";
import type { ReactElement } from "react";
import { fn } from "storybook/test";
import {
	Stepper,
	StepperStep,
	type StepperProps,
} from "@/components/ui/Stepper";

type StoryArgs = StepperProps & { labels: Array<string> };

const meta = {
	title: "UI/Stepper/Stepper",
	component: Stepper,
	parameters: { layout: "padded" },
	argTypes: {
		currentStep: { control: { type: "number", min: 0, max: 5, step: 1 } },
		labels: { control: "object" },
		children: { control: false },
	},
	args: {
		currentStep: 0,
		children: [],
		labels: ["Setup", "Shifts", "Constraints", "Forecast", "Generate"],
	},
	render: ({ labels, ...args }): ReactElement => (
		<Stepper {...args}>
			{labels.map((label, index) => (
				<StepperStep key={index} label={label} />
			))}
		</Stepper>
	),
} satisfies Meta<StoryArgs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const FirstStepCurrent: Story = {};

export const MiddleStepCurrent: Story = { args: { currentStep: 2 } };

export const AllStepsCompleted: Story = { args: { currentStep: 5 } };

export const ClickableCompletedSteps: Story = {
	args: { currentStep: 2, onStepClick: fn() },
};

const withNarrowContainer: Decorator<StoryArgs> = (Story): ReactElement => (
	<div className="w-lg max-w-full">
		<Story />
	</div>
);

export const NarrowContainer: Story = {
	args: { currentStep: 2 },
	decorators: [withNarrowContainer],
};

export const FinishedNarrowContainer: Story = {
	...NarrowContainer,
	args: { currentStep: 5 },
};

const withSmallNarrowContainer: Decorator<StoryArgs> = (
	Story
): ReactElement => (
	<div className="w-80 max-w-full">
		<Story />
	</div>
);

export const NarrowContainer320: Story = {
	args: { currentStep: 2 },
	decorators: [withSmallNarrowContainer],
};

export const FinishedNarrowContainer320: Story = {
	...NarrowContainer320,
	args: { currentStep: 5, onStepClick: fn() },
};
