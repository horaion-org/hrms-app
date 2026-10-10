import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { fn } from "storybook/test";
import type { FunctionComponent } from "@/common/types";
import {
	INCLUDED_SHIFT_IDS,
	SHIFT_FIXTURES,
} from "@/features/scheduling/shifts/fixtures";
import type { Shift } from "@/features/scheduling/scheduleDraft";
import { ShiftsStep } from "@/features/scheduling/shifts/ShiftsStep";
import "@/common/i18n";

const shifts = SHIFT_FIXTURES;
const includedShiftIds = INCLUDED_SHIFT_IDS;

const meta = {
	title: "Features/Scheduling/Shifts/ShiftsStep",
	component: ShiftsStep,
	parameters: { layout: "padded" },
	args: {
		shifts,
		includedShiftIds,
		onIncludedChange: fn(),
		onAdd: fn(),
		onEdit: fn(),
		onDelete: fn(),
	},
} satisfies Meta<typeof ShiftsStep>;

export default meta;

type Story = StoryObj<typeof meta>;

const InteractiveDemo = (): FunctionComponent => {
	const [rows, setRows] = useState<Array<Shift>>(shifts);
	const [included, setIncluded] = useState(includedShiftIds);
	return (
		<ShiftsStep
			includedShiftIds={included}
			shifts={rows}
			onAdd={fn()}
			onEdit={fn()}
			onIncludedChange={setIncluded}
			onDelete={(shift) => {
				setRows((current) =>
					current.filter((row) => row.shiftId !== shift.shiftId)
				);
			}}
		/>
	);
};

export const Default: Story = { render: () => <InteractiveDemo /> };

export const NothingChosen: Story = {
	args: {
		includedShiftIds: [],
		problem: "Choose at least one shift to include in this schedule.",
	},
};

export const Empty: Story = { args: { shifts: [], includedShiftIds: [] } };

export const ReadOnly: Story = {
	args: { onAdd: undefined, onEdit: undefined, onDelete: undefined },
};

export const Hidden: Story = {
	args: {
		shifts: [],
		includedShiftIds: [],
		listProblem: {
			message: "You don’t have permission to see this department’s shifts.",
			alert: false,
		},
	},
};
