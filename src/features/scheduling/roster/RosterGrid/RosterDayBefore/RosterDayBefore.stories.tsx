import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";
import { RosterDayBefore } from "@/features/scheduling/roster/RosterGrid/RosterDayBefore";
import type { DayBeforeRun } from "@/features/scheduling/startingContext/daysBeforeRun";
import "@/common/i18n";

const dayOf = (
	what: DayBeforeRun["what"],
	enteredByHand: boolean
): DayBeforeRun => ({
	memberProfileId: "mp-1",
	date: "2026-10-13",
	what,
	enteredByHand,
});

const NIGHT = {
	kind: "shift",
	name: "Night",
	start: "22:00",
	end: "06:00",
} as const;

/** In a muted column before the run, a day column wide. */
const inMutedColumn: Decorator = (Story) => (
	<div className="w-32 bg-neutral-100 p-3">
		<Story />
	</div>
);

const meta = {
	title: "Features/Scheduling/RosterGrid/RosterDayBefore",
	component: RosterDayBefore,
	args: { name: "Aisha Rahman", dayName: "Tuesday, 13 October" },
	decorators: [inMutedColumn],
} satisfies Meta<typeof RosterDayBefore>;

export default meta;

type Story = StoryObj<typeof meta>;

/** A shift entered by hand: the timeline's dotted entered look, with "Entered". */
export const EnteredShift: Story = { args: { day: dayOf(NIGHT, true) } };

/** A day off entered by hand, by its type. */
export const EnteredDayOff: Story = {
	args: { day: dayOf({ kind: "off", dayType: "REST" }, true) },
};

/** A shift an earlier roster gave: muted, a plain border, no word. */
export const RosteredShift: Story = { args: { day: dayOf(NIGHT, false) } };

/** A day off an earlier roster gave. */
export const RosteredDayOff: Story = {
	args: { day: dayOf({ kind: "off", dayType: null }, false) },
};

/** Approved leave, without its type: the API sends none. */
export const Leave: Story = { args: { day: dayOf({ kind: "leave" }, false) } };

/** Not known: blank, its label says so. */
export const NotKnown: Story = {};

/** Beside an open panel: the time only, as tall as a compact tile. */
export const Compact: Story = {
	args: { day: dayOf(NIGHT, true), compact: true },
};
