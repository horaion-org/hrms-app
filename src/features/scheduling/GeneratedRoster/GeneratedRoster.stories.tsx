import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { GeneratedRoster } from "@/features/scheduling/GeneratedRoster";
import { frozenConstraintsFixture } from "@/features/scheduling/constraints/fixtures";
import {
	emptyFindingsFixture,
	findingsOfEveryKindFixture,
	generatedScheduleFixture,
	generationFixture,
	scheduleAssignmentsFixture,
} from "@/features/scheduling/schedules/fixtures";
import { frozenShiftsFixture } from "@/features/scheduling/shifts/fixtures";
import "@/common/i18n";

const meta = {
	title: "Features/Scheduling/GeneratedRoster",
	component: GeneratedRoster,
	parameters: { layout: "padded" },
	args: {
		schedule: generatedScheduleFixture({ status: "GENERATED" }),
		assignments: scheduleAssignmentsFixture(),
		shifts: frozenShiftsFixture(),
		constraints: frozenConstraintsFixture(),
		view: { week: "2026-10-12" },
		onViewChange: fn(),
	},
} satisfies Meta<typeof GeneratedRoster>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Every kind of finding: the summary, the panel once opened, and markers on the grid. */
export const EveryKindOfFinding: Story = {
	args: {
		schedule: generatedScheduleFixture({
			status: "GENERATED",
			generation: generationFixture({ findings: findingsOfEveryKindFixture() }),
		}),
	},
};

/** Nothing found: no summary, no panel, no markers. */
export const NothingFound: Story = {
	args: {
		schedule: generatedScheduleFixture({
			status: "GENERATED",
			generation: generationFixture({ findings: emptyFindingsFixture() }),
		}),
	},
};

/** The Issues list open beside the grid. */
export const IssuesOpen: Story = {
	args: { view: { week: "2026-10-12", panel: "issues" } },
};
