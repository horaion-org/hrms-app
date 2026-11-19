import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import {
	callInMove,
	feasibleRepair,
	infeasibleRepair,
	partStretchRepair,
	reassignMove,
	stretchMove,
} from "@/features/scheduling/cover/engineRepairFixtures";
import { EngineRepairOptions } from "@/features/scheduling/cover/EngineRepairOptions";
import "@/common/i18n";

const meta = {
	title: "Features/Scheduling/Cover/EngineRepairOptions",
	component: EngineRepairOptions,
	parameters: { layout: "padded" },
	args: {
		names: {
			member: (membershipId: string): string => `Member ${membershipId}`,
			day: (): string => "Sat, Oct 17",
			hours: (minutes: number): string => String(minutes / 60),
		},
		repair: { status: "loading", askAgain: fn() },
	},
} satisfies Meta<typeof EngineRepairOptions>;

export default meta;

type Story = StoryObj<typeof meta>;

/** While the engine works. */
export const Asking: Story = {};

/** A call-in, a move and a stretch that fill it, then the engine's honest no. */
export const Options: Story = {
	args: {
		repair: {
			status: "ready",
			options: [
				feasibleRepair([callInMove()]),
				feasibleRepair([reassignMove(), stretchMove()]),
				infeasibleRepair(),
			],
			askAgain: fn(),
		},
	},
};

/** Chen stays on after the swing shift: a stretch checked by the engine, ready to review. */
export const OvertimeStretch: Story = {
	args: {
		repair: {
			status: "ready",
			options: [
				feasibleRepair([stretchMove()], {
					kind: "overtime_stretch",
					workingTimeRulesChecked: true,
					extraMinutes: { overtime: 120, restDayWork: 0, timeOffEarned: 0 },
				}),
			],
			askAgain: fn(),
		},
	},
};

/** Chen's stretch fills the gap's last two hours; the rest is still short, and the panel says what to do. */
export const PartialStretch: Story = {
	args: {
		repair: { status: "ready", options: [partStretchRepair()], askAgain: fn() },
	},
};

/** The engine found nothing. */
export const Nothing: Story = {
	args: { repair: { status: "ready", options: [], askAgain: fn() } },
};

/** The engine couldn't answer. */
export const Failed: Story = {
	args: { repair: { status: "refused", refusal: "failed", askAgain: fn() } },
};
