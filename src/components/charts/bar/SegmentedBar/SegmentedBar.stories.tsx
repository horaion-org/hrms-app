import type { Meta, StoryObj } from "@storybook/react-vite";
import { SegmentedBar } from "@/components/charts/bar/SegmentedBar";

const meta = {
	title: "Charts/Bar/SegmentedBar",
	component: SegmentedBar,
	args: {
		className: "w-80",
		label: "Changes after publishing, North Point",
		segments: [
			{ id: "manual", label: "By hand", colour: "inkBlue900", value: 3 },
			{
				id: "approved",
				label: "Leave approved",
				colour: "inkBlue500",
				value: 4,
			},
			{ id: "cover", label: "Cover", colour: "success600", value: 1 },
		],
	},
} satisfies Meta<typeof SegmentedBar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const WithLegend: Story = { args: { legend: true } };
/** Half the length of a bar of 16, so several bars compare by length. */
export const ScaledToALargerBar: Story = { args: { scaleTo: 16 } };
