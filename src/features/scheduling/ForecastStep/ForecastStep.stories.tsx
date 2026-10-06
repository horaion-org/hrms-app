import type { Meta, StoryObj } from "@storybook/react-vite";
import { useReducer } from "react";
import { fn } from "storybook/test";
import type { FunctionComponent } from "@/common/types";
import { ForecastStep } from "@/features/scheduling/ForecastStep";
import {
	includedShifts,
	scheduleDraftReducer,
	seedScheduleDraft,
} from "@/features/scheduling/scheduleDraft";
import "@/common/i18n";

const meta = {
	title: "Features/Scheduling/ForecastStep",
	component: ForecastStep,
	parameters: { layout: "padded" },
	args: {
		mode: "shift",
		onModeChange: fn(),
		shifts: includedShifts(seedScheduleDraft()),
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
	const [draft, dispatch] = useReducer(
		scheduleDraftReducer,
		undefined,
		seedScheduleDraft
	);
	return (
		<ForecastStep
			demand={draft.demand}
			mode={draft.forecastMode}
			periodLabel="13 – 19 Apr 2026"
			shifts={includedShifts(draft)}
			onAllocationChange={(shiftId, roleId, allocated) => {
				dispatch({ type: "allocationChanged", shiftId, roleId, allocated });
			}}
			onAutoFill={() => {
				dispatch({ type: "demandAutoFilled" });
			}}
			onDemandChange={(slotStart, roleId, staff) => {
				dispatch({ type: "demandChanged", slotStart, roleId, staff });
			}}
			onModeChange={(mode) => {
				dispatch({ type: "forecastModeChosen", mode });
			}}
		/>
	);
};

export const ByShift: Story = { render: () => <InteractiveDemo /> };

export const TimeBlocks: Story = { args: { mode: "blocks" } };

export const OverAllocated: Story = {
	args: {
		problem:
			"Some shifts allocate more staff than they need. Reduce them under By Shift before continuing.",
	},
};
