import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { fn } from "storybook/test";
import type { FunctionComponent } from "@/common/types";
import { ConstraintsStep } from "@/features/scheduling/ConstraintsStep";
import { emptyScheduleDraft } from "@/features/scheduling/scheduleDraft";
import "@/common/i18n";

const { constraints, includedConstraintIds } = emptyScheduleDraft();

const meta = {
	title: "Features/Scheduling/ConstraintsStep",
	component: ConstraintsStep,
	parameters: { layout: "padded" },
	args: {
		constraints,
		includedConstraintIds,
		onIncludedChange: fn(),
		onDelete: fn(),
	},
} satisfies Meta<typeof ConstraintsStep>;

export default meta;

type Story = StoryObj<typeof meta>;

const InteractiveDemo = (): FunctionComponent => {
	const [rows, setRows] = useState(constraints);
	const [included, setIncluded] = useState(includedConstraintIds);
	return (
		<ConstraintsStep
			constraints={rows}
			includedConstraintIds={included}
			onIncludedChange={setIncluded}
			onDelete={(constraint) => {
				setRows((current) =>
					current.filter((row) => row.constraintId !== constraint.constraintId)
				);
			}}
		/>
	);
};

export const Default: Story = { render: () => <InteractiveDemo /> };

export const Empty: Story = {
	args: { constraints: [], includedConstraintIds: [] },
};
