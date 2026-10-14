import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { fn } from "storybook/test";
import type { FunctionComponent } from "@/common/types";
import {
	INCLUDED_SHIFT_IDS,
	SHIFT_FIXTURES,
	frozenShiftsFixture,
} from "@/features/scheduling/shifts/fixtures";
import type { ScheduleShift } from "@/features/scheduling/schedules/api";
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
	const [rows, setRows] = useState<Array<ScheduleShift>>(shifts);
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

const frozen = frozenShiftsFixture();

/** A generated schedule: its frozen copies, with nothing to tick, add, edit or delete. */
export const Generated: Story = {
	args: {
		frozen: true,
		shifts: frozen,
		includedShiftIds: frozen.map((shift) => shift.shiftId),
		onIncludedChange: undefined,
		onAdd: undefined,
		onEdit: undefined,
		onDelete: undefined,
	},
};
