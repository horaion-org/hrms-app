import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import type { FunctionComponent } from "@/common/types";
import { RosterShift } from "@/features/scheduling/RosterGrid";

const meta = {
	title: "Features/Scheduling/RosterGrid/RosterShift",
	component: RosterShift,
	args: {
		shift: {
			kind: "shift",
			assignmentId: "a-1",
			shiftId: "front-desk-am-copy",
			name: "Front Desk AM",
			group: "Front Desk",
			colour: "#E9A55A",
			start: "09:00",
			end: "15:00",
			unpaidBreakMinutes: 0,
			carriesOvertime: false,
			role: "Front Desk Lead",
		},
		label: "Aisha Rahman, Mon 09:00 – 15:00",
		timeRange: "09:00 – 15:00",
		selected: false,
		onSelect: fn(),
	},
	decorators: [
		(Story): NonNullable<FunctionComponent> => (
			<div className="w-32">
				<Story />
			</div>
		),
	],
} satisfies Meta<typeof RosterShift>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Selected: Story = { args: { selected: true } };

/** A day that needs a look: the filled dot in the corner; its words are in the day's panel. */
export const NeedsALook: Story = {
	args: {
		mark: "issue",
		label: "Aisha Rahman, Mon 09:00 – 15:00, needs a look: 1",
	},
};

/** A day changed by hand: the hollow ring in the same corner. */
export const Changed: Story = {
	args: { mark: "changed", label: "Aisha Rahman, Mon 09:00 – 15:00, changed" },
};

/** The role left out, as it repeats the member's job title, and a member's own leave in words. */
export const OwnLeaveRequested: Story = {
	args: {
		showsRole: false,
		status: "Leave requested",
		label: "Aisha Rahman, Mon 09:00 – 15:00, Leave requested",
	},
};
