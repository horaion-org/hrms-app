import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { fn } from "storybook/test";
import type { FunctionComponent } from "@/common/types";
import {
	autoFillDemand,
	includedShifts,
	rolesOf,
	seedScheduleDraft,
	type TimeBlockDemand,
} from "@/features/scheduling/scheduleDraft";
import { TimeBlockGrid } from "@/features/scheduling/TimeBlockGrid";
import "@/common/i18n";

const shifts = includedShifts(seedScheduleDraft());

const meta = {
	title: "Features/Scheduling/TimeBlockGrid",
	component: TimeBlockGrid,
	parameters: { layout: "padded" },
	args: {
		roles: rolesOf(shifts),
		demand: autoFillDemand(shifts),
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
				setDemand(autoFillDemand(shifts));
			}}
			onDemandChange={(slotStart, roleId, staff) => {
				setDemand((current) => ({
					...current,
					[slotStart]: { ...current[slotStart], [roleId]: staff },
				}));
			}}
		/>
	);
};

export const AutoFilled: Story = {};

export const Interactive: Story = { render: () => <InteractiveDemo /> };
