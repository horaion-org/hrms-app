import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { RosterRulesCheck } from "@/features/scheduling/rulesCheck/RosterRulesCheck";
import "@/common/i18n";

const meta = {
	title: "Features/Scheduling/RosterRulesCheck",
	component: RosterRulesCheck,
	parameters: { layout: "padded" },
	args: { check: { status: "loading", ask: fn() } },
} satisfies Meta<typeof RosterRulesCheck>;

export default meta;

type Story = StoryObj<typeof meta>;

/** While the schedule is validated. */
export const Validating: Story = {};

/** No rule broken, and a Tuesday nobody works. */
export const HoldsButShort: Story = {
	args: {
		check: {
			status: "ready",
			check: {
				status: "HOLDS",
				brokenRules: [],
				staffingGaps: [
					{
						date: "2026-11-10",
						message: "Front Desk AM is 2 short",
						missing: 2,
						constraintId: "k-2",
						constraintName: "Two at the desk",
					},
				],
			},
			ask: fn(),
		},
	},
};

/** Two rules broken, every shift staffed. */
export const Broken: Story = {
	args: {
		check: {
			status: "ready",
			check: {
				status: "BROKEN",
				brokenRules: [
					{
						rule: "most_minutes_a_day",
						constraintId: "k-1",
						constraintName: "Twelve hours a day",
					},
					{
						rule: "minimum_rest_between_shifts",
						constraintId: null,
						constraintName: null,
					},
				],
				staffingGaps: [],
			},
			ask: fn(),
		},
	},
};

/** The engine could check neither. */
export const Unchecked: Story = {
	args: {
		check: {
			status: "ready",
			check: { status: "UNCHECKED", brokenRules: [], staffingGaps: null },
			ask: fn(),
		},
	},
};
