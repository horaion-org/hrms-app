import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { fn } from "storybook/test";
import type { FunctionComponent } from "@/common/types";
import { weeksOf } from "@/common/weeks";
import type { RosterLegendEntry } from "@/features/scheduling/roster/roster";
import { RosterWeekBar } from "@/features/scheduling/RosterWeekBar";
import "@/common/i18n";

const weeks = weeksOf({ start: "2026-04-13", end: "2026-04-26" });

/** A day off, leave and each shift in its colour. */
const legend: Array<RosterLegendEntry> = [
	{ kind: "off" },
	{ kind: "leave" },
	{
		kind: "shift",
		shiftId: "front-desk-am-copy",
		name: "Front Desk AM",
		colour: "#E9A55A",
	},
	{
		kind: "shift",
		shiftId: "swing-shift-copy",
		name: "Swing Shift",
		colour: "#6E72A5",
	},
];

const meta = {
	title: "Features/Scheduling/RosterWeekBar",
	component: RosterWeekBar,
	parameters: { layout: "padded" },
	args: {
		weeks,
		week: "2026-04-13",
		legend,
		onWeekChange: fn(),
		onToday: fn(),
	},
} satisfies Meta<typeof RosterWeekBar>;

export default meta;

type Story = StoryObj<typeof meta>;

const InteractiveDemo = (): FunctionComponent => {
	const [week, setWeek] = useState("2026-04-13");
	return (
		<RosterWeekBar
			legend={legend}
			week={week}
			weeks={weeks}
			onWeekChange={setWeek}
			onToday={() => {
				setWeek("2026-04-13");
			}}
		/>
	);
};

export const Default: Story = { render: () => <InteractiveDemo /> };
