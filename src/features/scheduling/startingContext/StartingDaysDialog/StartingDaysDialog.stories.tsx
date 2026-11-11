import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import {
	carriedWeek,
	earlierDayTypedWeek,
	firstWeek,
} from "@/features/scheduling/startingContext/fixtures";
import { StartingDaysDialog } from "@/features/scheduling/startingContext/StartingDaysDialog";
import "@/common/i18n";

const meta = {
	title: "Features/Scheduling/StartingContext/StartingDaysDialog",
	component: StartingDaysDialog,
	args: {
		open: true,
		week: firstWeek(),
		saving: false,
		onSave: fn(),
		onClose: fn(),
	},
} satisfies Meta<typeof StartingDaysDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

/** No roster before the period: every day not on leave can be entered. */
export const FirstRoster: Story = {};

/** A published roster locks Tan's week; Siti, a new joiner, can still be entered. */
export const CarriedOver: Story = { args: { week: carriedWeek() } };

/** Siti has a day typed in the earlier week, so both weeks show from the start. */
export const TwoWeeksShown: Story = { args: { week: earlierDayTypedWeek() } };

export const Saving: Story = { args: { saving: true } };

export const Refused: Story = {
	args: {
		problem:
			"A day couldn’t be saved. Check that its shift is still in use, then try again.",
	},
};
