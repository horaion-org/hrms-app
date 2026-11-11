import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { ConstraintTable } from "@/features/scheduling/constraints/ConstraintTable";
import {
	BRANCH_POLICY_FIXTURE,
	COMPANY_CONSTRAINT_FIXTURES,
	CONSTRAINT_FIXTURES,
	DEPARTMENTS_POLICY_FIXTURE,
} from "@/features/scheduling/constraints/fixtures";
import "@/common/i18n";

const constraints = [...COMPANY_CONSTRAINT_FIXTURES, ...CONSTRAINT_FIXTURES];

const meta = {
	title: "Features/Scheduling/Constraints/ConstraintTable",
	component: ConstraintTable,
	parameters: { layout: "padded" },
	args: { constraints, onEdit: fn(), onDelete: fn() },
} satisfies Meta<typeof ConstraintTable>;

export default meta;

type Story = StoryObj<typeof meta>;

/** One department chosen: company constraints can be made stricter there. */
export const OneDepartment: Story = { args: { onReplace: fn() } };

/** Every department in reach: each row names its Branch and Department; company rows read "All departments". */
export const AcrossDepartments: Story = {
	args: { showBranch: true, showDepartment: true },
};

/** The copies a generated schedule keeps: no status, nothing to change. */
export const Frozen: Story = {
	args: { frozen: true, onEdit: undefined, onDelete: undefined },
};

/** Work-policy rows with a reach: the Department column says where each applies. */
export const WorkPolicyReach: Story = {
	args: {
		showDepartment: true,
		constraints: [
			COMPANY_CONSTRAINT_FIXTURES[0]!,
			BRANCH_POLICY_FIXTURE,
			DEPARTMENTS_POLICY_FIXTURE,
		],
	},
};

export const Empty: Story = { args: { constraints: [] } };
