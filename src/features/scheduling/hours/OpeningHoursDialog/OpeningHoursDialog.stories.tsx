import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import {
	editableMember,
	midMonthOpenings,
} from "@/features/scheduling/hours/fixtures";
import { OpeningHoursDialog } from "@/features/scheduling/hours/OpeningHoursDialog";
import { firstWeek } from "@/features/scheduling/startingContext/fixtures";
import "@/common/i18n";

const meta = {
	title: "Features/Scheduling/Hours/OpeningHoursDialog",
	component: OpeningHoursDialog,
	args: {
		open: true,
		openings: midMonthOpenings([
			editableMember("p-tan"),
			editableMember("p-siti", { editable: false, rosteredBefore: true }),
		]),
		people: firstWeek().members,
		generated: false,
		saving: false,
		onSave: fn(),
		onClose: fn(),
	},
} satisfies Meta<typeof OpeningHoursDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

/** A draft starting 9 November: Tan's hours are unknown, Siti's come from rosters. */
export const OnADraft: Story = {};

/** The week already has a roster: saved hours are used once the month is generated again. */
export const OnAGeneratedWeek: Story = { args: { generated: true } };

/** Tan's hours were entered on an earlier week and can't change here. */
export const EnteredElsewhere: Story = {
	args: {
		openings: midMonthOpenings([
			editableMember("p-tan", {
				editable: false,
				workedMinutes: 4320,
				overtimeMinutes: 1680,
				enteredAsOf: "2026-11-02",
			}),
			editableMember("p-siti"),
		]),
	},
};

export const Refused: Story = {
	args: {
		problem:
			"This roster is published, so the hours before it can no longer change here.",
	},
};
