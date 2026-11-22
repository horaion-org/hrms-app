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

/**
 * A run starting Thursday 15 October with days before it known: Monday to
 * Wednesday show as muted columns, the week of 5 October (no schedule of its
 * own) is offered in the bar as "Before these days", and the note says who
 * has days entered by hand.
 */
export const DaysBeforeTheRun: Story = {
	args: {
		schedule: {
			...generatedScheduleFixture({ status: "GENERATED" }),
			coveredFrom: "2026-10-15",
		},
		departmentWeeks: {
			weeks: [
				{
					start: "2026-10-05",
					end: "2026-10-11",
					state: "Not generated",
					disabled: true,
				},
				{ start: "2026-10-12", end: "2026-10-18", state: "To review" },
			],
			onWeekChange: fn(),
		},
		daysBefore: {
			status: "ready",
			days: [
				{
					memberProfileId: "mp-1",
					date: "2026-10-07",
					what: { kind: "shift", name: "Night", start: "22:00", end: "06:00" },
					enteredByHand: true,
				},
				{
					memberProfileId: "mp-1",
					date: "2026-10-13",
					what: { kind: "off", dayType: "REST" },
					enteredByHand: false,
				},
				{
					memberProfileId: "mp-2",
					date: "2026-10-14",
					what: { kind: "leave" },
					enteredByHand: false,
				},
			],
		},
	},
};
