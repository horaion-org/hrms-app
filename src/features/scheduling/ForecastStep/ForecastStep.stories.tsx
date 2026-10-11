import type { Meta, StoryObj } from "@storybook/react-vite";
import { useReducer } from "react";
import { fn } from "storybook/test";
import type { FunctionComponent } from "@/common/types";
import { ForecastStep } from "@/features/scheduling/ForecastStep";
import {
	ALLOCATION_FIXTURES,
	INCLUDED_SHIFT_IDS,
	SHIFT_FIXTURES,
} from "@/features/scheduling/shifts/fixtures";
import {
	emptyScheduleDraft,
	includedShifts,
	scheduleDraftReducer,
	type ScheduleDraft,
} from "@/features/scheduling/scheduleDraft";

const shifts = includedShifts(
	{ includedShiftIds: INCLUDED_SHIFT_IDS },
	SHIFT_FIXTURES
);

const chosen = (): ScheduleDraft => ({
	...emptyScheduleDraft(),
	includedShiftIds: INCLUDED_SHIFT_IDS,
	allocations: ALLOCATION_FIXTURES,
});
import "@/common/i18n";

const meta = {
	title: "Features/Scheduling/ForecastStep",
	component: ForecastStep,
	parameters: { layout: "padded" },
	args: {
		mode: "SHIFT",
		onModeChange: fn(),
		shifts,
		allocations: ALLOCATION_FIXTURES,
		onAllocationChange: fn(),
		demand: {},
		onDemandChange: fn(),
		onAutoFill: fn(),
		periodLabel: "13 – 19 Apr 2026",
	},
} satisfies Meta<typeof ForecastStep>;

export default meta;

type Story = StoryObj<typeof meta>;

const InteractiveDemo = (): FunctionComponent => {
	const [draft, dispatch] = useReducer(scheduleDraftReducer, undefined, chosen);
	return (
		<ForecastStep
			allocations={draft.allocations}
			demand={draft.demand}
			mode={draft.forecastMode}
			periodLabel="13 – 19 Apr 2026"
			shifts={includedShifts(draft, SHIFT_FIXTURES)}
			onAllocationChange={(shiftId, jobTitleId, allocated) => {
				dispatch({ type: "allocationChanged", shiftId, jobTitleId, allocated });
			}}
			onAutoFill={() => {
				dispatch({ type: "demandAutoFilled", shifts: SHIFT_FIXTURES });
			}}
			onDemandChange={(slotStart, jobTitleId, staff) => {
				dispatch({ type: "demandChanged", slotStart, jobTitleId, staff });
			}}
			onModeChange={(mode) => {
				dispatch({ type: "forecastModeChosen", mode });
			}}
		/>
	);
};

export const ByShift: Story = { render: () => <InteractiveDemo /> };

export const TimeBlocks: Story = { args: { mode: "BLOCKS" } };
