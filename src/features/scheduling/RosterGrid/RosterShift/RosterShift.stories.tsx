import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import type { FunctionComponent } from "@/common/types";
import { RosterShift } from "@/features/scheduling/RosterGrid";

const meta = {
	title: "Features/Scheduling/RosterGrid/RosterShift",
	component: RosterShift,
	args: {
		shift: {
			shiftId: "s-1",
			date: "2026-04-16",
			start: "09:00",
			end: "18:00",
			role: "Front Desk",
			kind: "full",
			breakMinutes: 60,
			location: "Main Branch",
		},
		label: "John Lim, Thu 09:00 – 18:00",
		timeRange: "09:00 – 18:00",
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

export const Full: Story = {};

export const Half: Story = {
	args: { shift: { ...meta.args.shift, kind: "half" } },
};

export const Open: Story = {
	args: {
		shift: { ...meta.args.shift, kind: "open", role: "Open Shift" },
	},
};

export const Selected: Story = { args: { selected: true } };
