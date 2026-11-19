import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";
import type { FunctionComponent } from "@/common/types";
import { ConstraintOrigin } from "@/features/scheduling/constraints/ConstraintOrigin";
import "@/common/i18n";

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
/** The company has since tightened its constraint past the department's: both apply. */
export const CompanyRuleApplies: Story = {
	args: {
		constraint: {
			level: "DEPARTMENT",
			lock: null,
			locked: true,
			overridesConstraintId: "company-rest",
			replacementStatus: "NO_LONGER_STRICTER",
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
/** On the work policy's own list, only the lock. */
export const LockOnly: Story = { args: { showLevel: false } };

/** The locked company token in a cell as narrow as the constraints table's Set by column on a small screen. */
export const LockedInANarrowCell: Story = {
	decorators: [
		(Story: Parameters<Decorator>[0]): NonNullable<FunctionComponent> => (
			<div className="w-32 border border-neutral-400 p-3">
				<Story />
			</div>
		),
	],
};
