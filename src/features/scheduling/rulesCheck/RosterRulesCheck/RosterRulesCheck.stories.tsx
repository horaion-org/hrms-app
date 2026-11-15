import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { RosterRulesCheck } from "@/features/scheduling/rulesCheck/RosterRulesCheck";
import "@/common/i18n";

const meta = {
	title: "Features/Scheduling/RosterRulesCheck",
	component: RosterRulesCheck,
	parameters: { layout: "padded" },
	args: { check: { status: "idle", ask: fn() } },
} satisfies Meta<typeof RosterRulesCheck>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Before the rules are checked. */
export const NotCheckedYet: Story = {};

/** Every rule holds. */
export const Holds: Story = {
	args: {
		check: {
			status: "ready",
			check: { status: "HOLDS", brokenRules: [] },
			ask: fn(),
		},
	},
};

/** Two rules broken: one named by the company, one by the app's label. */
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
			},
			ask: fn(),
		},
	},
};

/** The engine could not check. */
export const Unchecked: Story = {
	args: {
		check: {
			status: "ready",
			check: { status: "UNCHECKED", brokenRules: [] },
			ask: fn(),
		},
	},
};
