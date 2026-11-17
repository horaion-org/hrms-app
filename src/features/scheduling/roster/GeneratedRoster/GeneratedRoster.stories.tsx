import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { GeneratedRoster } from "@/features/scheduling/roster/GeneratedRoster";
import { frozenConstraintsFixture } from "@/features/scheduling/constraints/fixtures";
import type { ScheduleAssignment } from "@/features/scheduling/schedules/api";
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

/** What follows the roster on its page, so the stories below show where it starts with a panel open. */
const withHoursBelow: Decorator = (Story) => (
	<>
		<Story />
		<section
			aria-label="Hours summary"
			className="mt-8 rounded-lg border border-neutral-400 p-4"
		>
			Hours
		</section>
	</>
);

/** The fixture's people ten times over: 30 people, each copy its own member. */
const thirtyPeople = (): Array<ScheduleAssignment> =>
	Array.from({ length: 10 }, (_, copy) =>
		scheduleAssignmentsFixture().map((row) => ({
			...row,
			assignmentId: `${row.assignmentId}-${copy}`,
			member: row.member && {
				...row.member,
				membershipId: `${row.member.membershipId}-${copy}`,
				memberProfileId: `${row.member.memberProfileId}-${copy}`,
				displayName: `${row.member.displayName} ${copy + 1}`,
			},
		}))
	).flat();

/** A long Issues list beside a short grid: the panel keeps to the grid's height and scrolls inside. */
export const LongPanelShortGrid: Story = {
	decorators: [withHoursBelow],
	args: {
		schedule: generatedScheduleFixture({
			status: "GENERATED",
			generation: generationFixture({ findings: findingsOfEveryKindFixture() }),
		}),
		view: { week: "2026-10-12", panel: "issues" },
	},
};

/** A short Issues list beside 30 people: the panel keeps its own height and stays in view. */
export const ShortPanelLongGrid: Story = {
	decorators: [withHoursBelow],
	args: {
		assignments: thirtyPeople(),
		view: { week: "2026-10-12", panel: "issues" },
	},
};

/** The panel closed: the grid takes the full width and the hours follow it. */
export const PanelClosedWithHours: Story = {
	decorators: [withHoursBelow],
};
