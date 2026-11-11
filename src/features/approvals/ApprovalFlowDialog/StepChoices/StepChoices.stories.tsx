import { QueryClient } from "@tanstack/react-query";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useForm } from "react-hook-form";
import type { FunctionComponent } from "@/common/types";
import {
	newStep,
	type FlowStepValues,
	type FlowValues,
} from "@/features/approvals/ApprovalFlowDialog/schema";
import {
	StepChoices,
	type StepChoicesProps,
} from "@/features/approvals/ApprovalFlowDialog/StepChoices";
import { storyProviders } from "@/features/organisation/storyApi";

const client = new QueryClient({
	defaultOptions: { queries: { retry: false, staleTime: Infinity } },
});

const NAMED_PEOPLE: FlowStepValues["members"] = [
	{ membershipId: "m-3", displayName: "Siti Rahman", status: "ACTIVE" },
	{ membershipId: "m-4", displayName: "Daniel Tan", status: "ACTIVE" },
];

type StepChoicesInFormProps = Omit<
	StepChoicesProps,
	"control" | "index" | "idPrefix"
> & {
	/** The step the form starts with. */
	step: FlowStepValues;
};

/** StepChoices inside a one-step flow form, as the dialog renders it. */
const StepChoicesInForm = ({
	step,
	...props
}: StepChoicesInFormProps): FunctionComponent => {
	const { control } = useForm<FlowValues>({
		defaultValues: {
			departmentId: "",
			name: "Front Office publishing",
			steps: [step],
			distinctApprovers: false,
		},
	});
	return (
		<div className="flex max-w-140 flex-col gap-4">
			<StepChoices {...props} control={control} idPrefix="story" index={0} />
		</div>
	);
};

const meta = {
	title: "Features/Approvals/ApprovalFlowDialog/StepChoices",
	component: StepChoicesInForm,
	args: {
		companyId: "story-company",
		anyoneLabel: "Anyone who can publish in Front Office",
		disabled: false,
		peopleHint: "They decide this step.",
		step: newStep(),
	},
	decorators: [storyProviders(client)],
} satisfies Meta<typeof StepChoicesInForm>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Anyone who holds the review permission decides; one approval is enough. */
export const AnyoneWhoCan: Story = {};

/** Only the named people, and any one of them decides. */
export const AnyOfThesePeople: Story = {
	args: {
		step: {
			...newStep(),
			rule: "MEMBERS",
			quorum: "ANY",
			members: NAMED_PEOPLE,
		},
	},
};

/** Only the named people, and all of them must approve. */
export const AllOfThesePeople: Story = {
	args: {
		step: {
			...newStep(),
			rule: "MEMBERS",
			quorum: "ALL",
			members: NAMED_PEOPLE,
		},
	},
};
