import type { Meta, StoryObj } from "@storybook/react-vite";
import { ConstraintOrigin } from "@/features/scheduling/constraints/ConstraintOrigin";

const meta = {
	title: "Scheduling/Constraint origin",
	component: ConstraintOrigin,
	args: {
		constraint: {
			level: "COMPANY",
			lock: "LOCKED",
			locked: true,
			overridesConstraintId: null,
		},
	},
} satisfies Meta<typeof ConstraintOrigin>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Set by the company and locked: every schedule applies it. */
export const CompanyLocked: Story = {};
/** A company default: ticked on new drafts, may be left out. */
export const CompanyDefault: Story = {
	args: {
		constraint: {
			level: "COMPANY",
			lock: "DEFAULT",
			locked: false,
			overridesConstraintId: null,
		},
	},
};
/** The department's stricter version of a locked company constraint. */
export const StricterHere: Story = {
	args: {
		constraint: {
			level: "DEPARTMENT",
			lock: null,
			locked: true,
			overridesConstraintId: "company-rest",
		},
	},
};
/** The department's own constraint. */
export const Department: Story = {
	args: {
		constraint: {
			level: "DEPARTMENT",
			lock: null,
			locked: false,
			overridesConstraintId: null,
		},
	},
};
/** On the Scheduling policy's own list, only the lock. */
export const LockOnly: Story = { args: { showLevel: false } };
