import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import {
	callInMove,
	feasibleRepair,
	infeasibleRepair,
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
		repair: { status: "idle", ask: fn() },
	},
} satisfies Meta<typeof EngineRepairOptions>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Before the engine is asked. */
export const NotAskedYet: Story = {};

/** While the engine works. */
export const Asking: Story = {
	args: { repair: { status: "loading", ask: fn() } },
};

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
			ask: fn(),
		},
	},
};

/** The engine found nothing. */
export const Nothing: Story = {
	args: { repair: { status: "ready", options: [], ask: fn() } },
};

/** The engine couldn't answer. */
export const Failed: Story = {
	args: { repair: { status: "refused", refusal: "failed", ask: fn() } },
};
