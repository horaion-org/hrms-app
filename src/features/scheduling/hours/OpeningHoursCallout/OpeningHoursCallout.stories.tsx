import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { OpeningHoursCallout } from "@/features/scheduling/hours/OpeningHoursCallout";
import "@/common/i18n";

const meta = {
	title: "Features/Scheduling/Hours/OpeningHoursCallout",
	component: OpeningHoursCallout,
	args: {
		asOf: "2026-11-09",
		hours: { kind: "read", unknownCount: 30 },
		onAdd: fn(),
		onRetry: fn(),
	},
} satisfies Meta<typeof OpeningHoursCallout>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Nobody's hours from 1 to 8 November are known. */
export const Unknown: Story = {};

/** Before the first week has a draft: the button saves it, then opens the hours. */
export const NoDraftYet: Story = {
	args: { hours: { kind: "notRead", carried: false } },
};

export const EveryoneKnown: Story = {
	args: { hours: { kind: "read", unknownCount: 0 } },
};

export const StartsOnTheFirst: Story = {
	args: { asOf: "2027-03-01", hours: { kind: "notNeeded" } },
};

export const ReadFailed: Story = { args: { hours: { kind: "failed" } } };
