import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { fn } from "storybook/test";
import type { FunctionComponent } from "@/common/types";
import { seedScheduleDraft } from "@/features/scheduling/scheduleDraft";
import { ShiftsStep } from "@/features/scheduling/ShiftsStep";
import "@/common/i18n";

const { shifts, includedShiftIds } = seedScheduleDraft();

const meta = {
	title: "Features/Scheduling/ShiftsStep",
	component: ShiftsStep,
	parameters: { layout: "padded" },
	args: {
		shifts,
		includedShiftIds,
		onIncludedChange: fn(),
		onDelete: fn(),
	},
} satisfies Meta<typeof ShiftsStep>;

export default meta;

type Story = StoryObj<typeof meta>;

const InteractiveDemo = (): FunctionComponent => {
	const [rows, setRows] = useState(shifts);
	const [included, setIncluded] = useState(includedShiftIds);
	return (
		<ShiftsStep
			includedShiftIds={included}
			shifts={rows}
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
