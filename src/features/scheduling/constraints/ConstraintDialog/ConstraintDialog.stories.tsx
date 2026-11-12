import type { ReactElement } from "react";
import { I18nextProvider } from "react-i18next";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { authTestI18n } from "@/features/auth/testingI18n";
import { ConstraintDialog } from "@/features/scheduling/constraints/ConstraintDialog";
import {
	COMPANY_CONSTRAINT_FIXTURES,
	CONSTRAINT_FIXTURES,
	CONSTRAINT_OPTIONS,
	DAYS_LIMIT_FIXTURE,
	DEPARTMENTS_POLICY_FIXTURE,
} from "@/features/scheduling/constraints/fixtures";
import { reachValueOf } from "@/features/scheduling/policy/policyReach";

const meta = {
	title: "Features/Scheduling/Constraints/ConstraintDialog",
	component: ConstraintDialog,
	decorators: [
		(Story): ReactElement => (
			<I18nextProvider i18n={authTestI18n}>
				<Story />
			</I18nextProvider>
		),
	],
	args: {
		options: { status: "ready", options: CONSTRAINT_OPTIONS },
		onSave: (): Promise<void> => Promise.resolve(),
		onClose: (): void => {},
	},
} satisfies Meta<typeof ConstraintDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Add: Story = {};
export const EditShiftStaffing: Story = {
	args: { editing: CONSTRAINT_FIXTURES[2] },
};
export const EditStandIns: Story = {
	args: { editing: CONSTRAINT_FIXTURES[1] },
};
export const EditWithoutRequirement: Story = {
	args: { editing: CONSTRAINT_FIXTURES[5] },
};
/** The days limit: a number and the day types that break a run, chosen from the API's list. */
export const EditDaysLimit: Story = {
	args: { editing: DAYS_LIMIT_FIXTURE },
};
export const OptionsLoading: Story = {
	args: { options: { status: "pending" } },
};
export const OptionsHidden: Story = { args: { options: { status: "hidden" } } };
/** A company constraint of the Scheduling policy: the lock is offered. */
export const SchedulingPolicy: Story = { args: { withLock: true } };

/** A work-policy constraint for two chosen Departments: the lock, and where it applies. */
export const WorkPolicyWithReach: Story = {
	args: {
		withLock: true,
		editing: DEPARTMENTS_POLICY_FIXTURE,
		reach: {
			choices: {
				branches: [
					{ branchId: "b-1", name: "Orchard", country: "SG", status: "ACTIVE" },
				],
				departments: [
					{
						departmentId: "d-2",
						name: "Bar",
						branchId: "b-1",
						branchName: "Orchard",
						country: "SG",
						status: "ACTIVE",
					},
					{
						departmentId: "d-1",
						name: "Kitchen",
						branchId: "b-1",
						branchName: "Orchard",
						country: "SG",
						status: "ACTIVE",
					},
				],
			},
			initial: reachValueOf(DEPARTMENTS_POLICY_FIXTURE),
		},
	},
};
/** Making a locked company constraint stricter for one department. */
export const ReplacingALockedConstraint: Story = {
	args: { replacing: COMPANY_CONSTRAINT_FIXTURES[0] },
};
