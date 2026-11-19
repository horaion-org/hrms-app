import type { Meta, StoryObj } from "@storybook/react-vite";
import { KeyFigure } from "@/components/ui/KeyFigure";

const meta = {
	title: "UI/KeyFigure",
	component: KeyFigure,
	args: {
		className: "max-w-xs",
		label: "People short",
		value: "21",
		unit: "next 14 days",
		status: { tone: "error", label: "Act" },
		change: { direction: "up", amount: "6", description: "Up 6" },
		comparison: "on the 14 days before",
	},
} satisfies Meta<typeof KeyFigure>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const OnTrack: Story = {
	args: {
		value: "0",
		status: { tone: "success", label: "On track" },
		change: { direction: "down", amount: "4", description: "Down 4" },
	},
};

export const FigureAlone: Story = {
	args: {
		label: "Next week published",
		value: "5",
		unit: "of 8 departments",
		status: undefined,
		change: undefined,
		comparison: undefined,
	},
};
