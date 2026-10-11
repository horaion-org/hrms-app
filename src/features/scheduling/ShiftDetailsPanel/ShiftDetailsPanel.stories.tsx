import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { ShiftDetailsPanel } from "@/features/scheduling/ShiftDetailsPanel";
import "@/common/i18n";

const meta = {
	title: "Features/Scheduling/ShiftDetailsPanel",
	component: ShiftDetailsPanel,
	args: {
		staffName: "John Lim",
		shift: {
			shiftId: "s-1",
			date: "2026-04-16",
			start: "09:00",
			end: "18:00",
			role: "Front Desk",
			kind: "full",
			breakMinutes: 60,
			location: "Main Branch",
			notes: "Swapped with Wednesday to avoid consecutive days.",
		},
		editable: true,
		onClose: fn(),
		onDelete: fn(),
	},
} satisfies Meta<typeof ShiftDetailsPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Editable: Story = {};

export const ReadOnly: Story = { args: { editable: false } };

export const OpenShift: Story = {
	args: {
		shift: {
			...meta.args.shift,
			kind: "open",
			role: "Open Shift",
			notes: undefined,
		},
	},
};
