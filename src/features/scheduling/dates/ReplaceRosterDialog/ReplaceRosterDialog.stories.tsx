import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { ReplaceRosterDialog } from "@/features/scheduling/dates/ReplaceRosterDialog";
import "@/common/i18n";

const THURSDAY_TO_SUNDAY = { from: "2026-11-19", to: "2026-11-22" };

const meta = {
	title: "Features/Scheduling/Dates/ReplaceRosterDialog",
	component: ReplaceRosterDialog,
	args: {
		replaces: { days: [THURSDAY_TO_SUNDAY], seenByStaff: [], handChanges: 0 },
		onConfirm: fn(),
		onClose: fn(),
	},
} satisfies Meta<typeof ReplaceRosterDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

export const ToReviewNeverPublished: Story = {};
export const ChangedByHand: Story = {
	args: {
		replaces: { days: [THURSDAY_TO_SUNDAY], seenByStaff: [], handChanges: 2 },
	},
};
export const WithdrawnAndChangedByHand: Story = {
	args: {
		replaces: {
			days: [THURSDAY_TO_SUNDAY],
			seenByStaff: [THURSDAY_TO_SUNDAY],
			handChanges: 2,
		},
	},
};
