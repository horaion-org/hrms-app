import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { fn } from "storybook/test";
import type { FunctionComponent } from "@/common/types";
import { ConstraintsStep } from "@/features/scheduling/constraints/ConstraintsStep";
import {
	CONSTRAINT_FIXTURES,
	INCLUDED_CONSTRAINT_IDS,
	frozenConstraintsFixture,
} from "@/features/scheduling/constraints/fixtures";
import {
	constraintRowsOf,
	type Constraint,
} from "@/features/scheduling/scheduleDraft";
import "@/common/i18n";

const constraints: Array<Constraint> = CONSTRAINT_FIXTURES;
const includedConstraintIds = INCLUDED_CONSTRAINT_IDS;

const meta = {
	title: "Features/Scheduling/Constraints/ConstraintsStep",
	component: ConstraintsStep,
	parameters: { layout: "padded" },
	args: {
		constraints,
		includedConstraintIds,
		onIncludedChange: fn(),
		onAdd: fn(),
		onEdit: fn(),
		onDelete: fn(),
	},
} satisfies Meta<typeof ConstraintsStep>;

export default meta;

type Story = StoryObj<typeof meta>;

const InteractiveDemo = (): FunctionComponent => {
	const [rows, setRows] = useState<Array<Constraint>>(constraints);
	const [included, setIncluded] = useState(includedConstraintIds);
	return (
		<ConstraintsStep
			constraints={rows}
			includedConstraintIds={included}
			onAdd={fn()}
			onEdit={fn()}
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

export const ReadOnly: Story = {
	args: { onAdd: undefined, onEdit: undefined, onDelete: undefined },
};

export const Hidden: Story = {
	args: {
		constraints: [],
		includedConstraintIds: [],
		listProblem: {
			message:
				"You don’t have permission to see this department’s constraints.",
			alert: false,
		},
	},
};

const frozen = constraintRowsOf(frozenConstraintsFixture());

/** A generated schedule: its frozen copies, with nothing to tick, add, edit or delete. */
export const Generated: Story = {
	args: {
		frozen: true,
		constraints: frozen,
		includedConstraintIds: frozen.map((constraint) => constraint.constraintId),
		onIncludedChange: undefined,
		onAdd: undefined,
		onEdit: undefined,
		onDelete: undefined,
	},
};
