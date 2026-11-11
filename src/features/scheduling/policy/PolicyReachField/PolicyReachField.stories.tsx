import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import "@/common/i18n";
import type { FunctionComponent } from "@/common/types";
import {
	PolicyReachField,
	type PolicyReachFieldProps,
} from "@/features/scheduling/policy/PolicyReachField";
import type {
	PolicyReachChoices,
	PolicyReachValue,
} from "@/features/scheduling/policy/policyReach";

/** Orchard with Kitchen and Bar, and Marina with Kitchen: two Departments share a name across Branches. */
const CHOICES: PolicyReachChoices = {
	branches: [
		{ branchId: "b-2", name: "Marina", country: "SG", status: "ACTIVE" },
		{ branchId: "b-1", name: "Orchard", country: "SG", status: "ACTIVE" },
	],
	departments: [
		{
			departmentId: "d-3",
			name: "Kitchen",
			branchId: "b-2",
			branchName: "Marina",
			country: "SG",
			status: "ACTIVE",
		},
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
};

type PolicyReachFieldInFormProps = Omit<
	PolicyReachFieldProps,
	"value" | "onChange" | "idPrefix"
> & {
	/** What the field starts with. */
	initial: PolicyReachValue;
};

/** The field holding its own value, as the dialog's form does. */
const PolicyReachFieldInForm = ({
	initial,
	...props
}: PolicyReachFieldInFormProps): FunctionComponent => {
	const [value, setValue] = useState(initial);
	return (
		<div className="flex max-w-140 flex-col gap-4">
			<PolicyReachField
				{...props}
				idPrefix="story"
				value={value}
				onChange={setValue}
			/>
		</div>
	);
};

const meta = {
	title: "Features/Scheduling/Policy/PolicyReachField",
	component: PolicyReachFieldInForm,
	args: {
		choices: CHOICES,
		disabled: false,
		initial: { appliesTo: "COMPANY", branchIds: [], departmentIds: [] },
	},
} satisfies Meta<typeof PolicyReachFieldInForm>;

export default meta;

type Story = StoryObj<typeof meta>;

/** The whole company: no units to choose. */
export const WholeCompany: Story = {};

/** One chosen Branch. */
export const ChosenBranches: Story = {
	args: {
		initial: { appliesTo: "BRANCHES", branchIds: ["b-1"], departmentIds: [] },
	},
};

/** Two chosen Departments of Orchard. */
export const ChosenDepartments: Story = {
	args: {
		initial: {
			appliesTo: "DEPARTMENTS",
			branchIds: [],
			departmentIds: ["d-1", "d-2"],
		},
	},
};

/** Chosen Departments with none picked yet: the dialog's refusal shows under the select. */
export const NoDepartmentChosen: Story = {
	args: {
		initial: { appliesTo: "DEPARTMENTS", branchIds: [], departmentIds: [] },
		error: "Choose at least one department.",
	},
};
