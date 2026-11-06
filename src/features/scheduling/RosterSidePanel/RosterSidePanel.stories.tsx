import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { RosterSidePanel } from "@/features/scheduling/RosterSidePanel";
import "@/common/i18n";

const meta = {
	title: "Features/Scheduling/RosterSidePanel",
	component: RosterSidePanel,
	parameters: { layout: "padded" },
	args: {
		title: "Changed",
		onClose: fn(),
		sections: [
			{
				key: "days",
				items: [
					{
						key: "a-1",
						title: "Aisha Rahman · Mon, Oct 12",
						lines: [
							"Day off → Front Desk AM · 09:00 – 15:00",
							"Changed Sat, Oct 10 by Moses Lee",
						],
					},
				],
			},
		],
	},
} satisfies Meta<typeof RosterSidePanel>;

export default meta;

type Story = StoryObj<typeof meta>;

/** One list, as Changed shows it. */
export const Default: Story = {};

/** A titled section beside one with nothing in it, which is left out. */
export const WithTitledSection: Story = {
	args: {
		title: "Issues",
		sections: [
			{ key: "empty", title: "Never shown", items: [] },
			{
				key: "startingPoints",
				title: "Where people started the week",
				items: [{ key: "m-1", lines: ["Aisha Rahman: Day 4 of a run"] }],
			},
		],
	},
};
