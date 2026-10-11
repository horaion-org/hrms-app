import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { fn } from "storybook/test";
import type { FunctionComponent } from "@/common/types";
import { RosterWeekBar } from "@/features/scheduling/RosterWeekBar";
import { weeksOf } from "@/features/scheduling/schedules";
import "@/common/i18n";

const weeks = weeksOf({ start: "2026-04-13", end: "2026-04-26" });

const meta = {
	title: "Features/Scheduling/RosterWeekBar",
	component: RosterWeekBar,
	parameters: { layout: "padded" },
	args: { weeks, week: "2026-04-13", onWeekChange: fn(), onToday: fn() },
} satisfies Meta<typeof RosterWeekBar>;

export default meta;

type Story = StoryObj<typeof meta>;

const InteractiveDemo = (): FunctionComponent => {
	const [week, setWeek] = useState("2026-04-13");
	return (
		<RosterWeekBar
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
