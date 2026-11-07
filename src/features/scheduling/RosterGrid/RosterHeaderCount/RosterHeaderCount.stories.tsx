import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { RosterHeaderCount } from "@/features/scheduling/RosterGrid/RosterHeaderCount";

const meta = {
	title: "Features/Scheduling/RosterHeaderCount",
	component: RosterHeaderCount,
	args: {
		count: { count: 2, tone: "attention" },
		label: "Ben Ong: 2 to look at. Show in Issues",
		onSelect: fn(),
	},
} satisfies Meta<typeof RosterHeaderCount>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Something to look at in a row or a day: the outline triangle in the warning tone. */
export const ToLookAt: Story = {};

/** Information only: the outline info circle. */
export const InformationOnly: Story = {
	args: {
		count: { count: 1, tone: "info" },
		label: "Ben Ong: 1 to look at. Show in Issues",
	},
};

const onDayHeaderGrey: Decorator = (Story) => (
	<div className="bg-neutral-200 p-4">
		<Story />
	</div>
);

/** On the grey day header, where the old marker's white box showed as a patch. */
export const OnTheDayHeader: Story = {
	decorators: [onDayHeaderGrey],
	args: { label: "Saturday, October 17: 1 to look at. Show in Issues" },
};
