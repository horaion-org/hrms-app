import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { EnteredDaysNote } from "@/features/scheduling/startingContext/EnteredDaysNote";
import "@/common/i18n";

const meta = {
	title: "Features/Scheduling/EnteredDaysNote",
	component: EnteredDaysNote,
	args: { count: 3, onShowWeek: fn() },
} satisfies Meta<typeof EnteredDaysNote>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Several people have days entered by hand the roster can show. */
export const SeveralPeople: Story = {};

/** One person. */
export const OnePerson: Story = { args: { count: 1 } };
