import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import {
	carriedWeek,
	firstWeek,
} from "@/features/scheduling/startingContext/fixtures";
import { StartingContextCallout } from "@/features/scheduling/startingContext/StartingContextCallout";
import "@/common/i18n";

const meta = {
	title: "Features/Scheduling/StartingContext/StartingContextCallout",
	component: StartingContextCallout,
	parameters: { layout: "padded" },
	args: { week: firstWeek(), enteredCount: 0, onAdd: fn() },
} satisfies Meta<typeof StartingContextCallout>;

export default meta;

type Story = StoryObj<typeof meta>;

/** No roster before the period and nothing entered: everyone starts rested. */
export const NoPreviousRoster: Story = {};

export const NoPreviousRosterWithEntries: Story = {
	args: { enteredCount: 1 },
};

/** A published roster covers the week before, but not Siti, a new joiner. */
export const CarriedWithNewJoiner: Story = { args: { week: carriedWeek() } };

/** The draft can't be changed, so there is nothing to add. */
export const ReadOnly: Story = { args: { onAdd: undefined } };
