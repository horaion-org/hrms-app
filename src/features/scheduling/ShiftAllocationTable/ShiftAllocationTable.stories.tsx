import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { fn } from "storybook/test";
import type { FunctionComponent } from "@/common/types";
import {
	includedShifts,
	scheduleDraftReducer,
	seedScheduleDraft,
} from "@/features/scheduling/scheduleDraft";
import { ShiftAllocationTable } from "@/features/scheduling/ShiftAllocationTable";
import "@/common/i18n";

const meta = {
	title: "Features/Scheduling/ShiftAllocationTable",
	component: ShiftAllocationTable,
	parameters: { layout: "padded" },
	args: {
		shifts: includedShifts(seedScheduleDraft()),
		onAllocationChange: fn(),
	},
} satisfies Meta<typeof ShiftAllocationTable>;

export default meta;

type Story = StoryObj<typeof meta>;

const InteractiveDemo = (): FunctionComponent => {
	const [draft, setDraft] = useState(seedScheduleDraft);
	return (
		<ShiftAllocationTable
			shifts={includedShifts(draft)}
			onAllocationChange={(shiftId, roleId, allocated) => {
				setDraft((current) =>
					scheduleDraftReducer(current, {
						type: "allocationChanged",
						shiftId,
						roleId,
						allocated,
					})
				);
			}}
		/>
	);
};

export const Default: Story = { render: () => <InteractiveDemo /> };
