import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { ShiftDetailsPanel } from "@/features/scheduling/ShiftDetailsPanel";
import "@/common/i18n";

const meta = {
	title: "Features/Scheduling/ShiftDetailsPanel",
	component: ShiftDetailsPanel,
	args: {
		staffName: "Aisha Rahman",
		shift: {
			kind: "shift",
			assignmentId: "a-1",
			shiftId: "front-desk-am-copy",
			name: "Front Desk AM",
			group: "Front Desk",
			colour: "#E9A55A",
			start: "09:00",
			end: "15:00",
			role: "Front Desk Lead",
			date: "2026-10-13",
		},
		onClose: fn(),
	},
} satisfies Meta<typeof ShiftDetailsPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

/** A generated roster's day: its frozen shift, read-only. */
export const Default: Story = {};
