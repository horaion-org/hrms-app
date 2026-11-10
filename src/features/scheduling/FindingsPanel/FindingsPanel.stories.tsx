import type { Meta, StoryObj } from "@storybook/react-vite";
import { daysOf } from "@/common/weeks";
import { FindingsPanel } from "@/features/scheduling/FindingsPanel";
import { findingNames } from "@/features/scheduling/roster/findings/findingNames";
import {
	findingsOfEveryKindFixture,
	generationFindingsFixture,
	scheduleAssignmentsFixture,
} from "@/features/scheduling/schedules/fixtures";
import { frozenShiftsFixture } from "@/features/scheduling/shifts/fixtures";
import "@/common/i18n";

const findings = findingsOfEveryKindFixture();

const meta = {
	title: "Features/Scheduling/FindingsPanel",
	component: FindingsPanel,
	parameters: { layout: "padded" },
	args: {
		findings,
		names: findingNames(findings, {
			assignments: scheduleAssignmentsFixture(),
			shifts: frozenShiftsFixture(),
			constraints: [],
		}),
		visibleDays: daysOf("2026-10-12"),
	},
} satisfies Meta<typeof FindingsPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Every kind of finding: the four known codes and one more, days' notes and members' notes. */
export const EveryKind: Story = {};

/** Schedule s-1's own findings. */
export const Default: Story = {
	args: { findings: generationFindingsFixture() },
};
