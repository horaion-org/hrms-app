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
	autoFillDemand,
	includedShifts,
	rolesOf,
	type TimeBlockDemand,
} from "@/features/scheduling/scheduleDraft";
import { TimeBlockGrid } from "@/features/scheduling/TimeBlockGrid";
import "@/common/i18n";

const shifts = includedShifts(
	{ includedShiftIds: INCLUDED_SHIFT_IDS },
	SHIFT_FIXTURES
);

const meta = {
	title: "Features/Scheduling/TimeBlockGrid",
	component: TimeBlockGrid,
	parameters: { layout: "padded" },
	args: {
		roles: rolesOf(shifts),
		demand: autoFillDemand(shifts, ALLOCATION_FIXTURES),
		periodLabel: "13 – 19 Apr 2026",
		onDemandChange: fn(),
		onAutoFill: fn(),
	},
} satisfies Meta<typeof TimeBlockGrid>;

export default meta;

type Story = StoryObj<typeof meta>;

const InteractiveDemo = (): FunctionComponent => {
	const [demand, setDemand] = useState<TimeBlockDemand>({});
	return (
		<TimeBlockGrid
			demand={demand}
			periodLabel="13 – 19 Apr 2026"
			roles={rolesOf(shifts)}
			onAutoFill={() => {
				setDemand(autoFillDemand(shifts, ALLOCATION_FIXTURES));
			}}
			onDemandChange={(slotStart, jobTitleId, staff) => {
				setDemand((current) => ({
					...current,
					[slotStart]: { ...current[slotStart], [jobTitleId]: staff },
				}));
			}}
		/>
	);
};

export const AutoFilled: Story = {};

export const Interactive: Story = { render: () => <InteractiveDemo /> };
