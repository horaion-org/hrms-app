import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { fn } from "storybook/test";
import type { FunctionComponent } from "@/common/types";
import {
	ALLOCATION_FIXTURES,
	INCLUDED_SHIFT_IDS,
	SHIFT_FIXTURES,
} from "@/features/scheduling/shifts/fixtures";
import {
	includedShifts,
	type Allocations,
} from "@/features/scheduling/scheduleDraft";

const shifts = includedShifts(
	{ includedShiftIds: INCLUDED_SHIFT_IDS },
	SHIFT_FIXTURES
);
import { ShiftAllocationTable } from "@/features/scheduling/ShiftAllocationTable";
import "@/common/i18n";

const meta = {
	title: "Features/Scheduling/ShiftAllocationTable",
	component: ShiftAllocationTable,
	parameters: { layout: "padded" },
	args: {
		shifts,
		allocations: ALLOCATION_FIXTURES,
		onAllocationChange: fn(),
	},
} satisfies Meta<typeof ShiftAllocationTable>;

export default meta;

type Story = StoryObj<typeof meta>;

const InteractiveDemo = (): FunctionComponent => {
	const [allocations, setAllocations] =
		useState<Allocations>(ALLOCATION_FIXTURES);
	return (
		<ShiftAllocationTable
			allocations={allocations}
			shifts={shifts}
			onAllocationChange={(shiftId, jobTitleId, allocated) => {
				setAllocations((current) => ({
					...current,
					[shiftId]: { ...current[shiftId], [jobTitleId]: allocated },
				}));
			}}
		/>
	);
};

export const Default: Story = { render: () => <InteractiveDemo /> };
