import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";
import {
	createMemoryHistory,
	createRootRoute,
	createRouter,
	RouterProvider,
} from "@tanstack/react-router";
import { fn } from "storybook/test";
import { RosterGrid } from "@/features/scheduling/RosterGrid";
import { findingNames } from "@/features/scheduling/roster/findings/findingNames";
import { placeFindings } from "@/features/scheduling/roster/findings/findingsOnGrid";
import { rosterFromAssignments } from "@/features/scheduling/roster/roster";
import { daysOf } from "@/features/scheduling/schedules";
import {
	findingsOfEveryKindFixture,
	scheduleAssignmentsFixture,
} from "@/features/scheduling/schedules/fixtures";
import "@/common/i18n";

const meta = {
	title: "Features/Scheduling/RosterGrid",
	component: RosterGrid,
	parameters: { layout: "padded" },
	args: {
		rows: rosterFromAssignments(scheduleAssignmentsFixture(), {
			start: "2026-10-12",
			end: "2026-10-18",
		}),
		days: daysOf("2026-10-12"),
		onAssignmentSelect: fn(),
	},
} satisfies Meta<typeof RosterGrid>;

export default meta;

type Story = StoryObj<typeof meta>;

/** A generated week of Front Office: shifts in their colours, days off and leave. */
export const Default: Story = {};

export const ShiftSelected: Story = {
	args: { selectedShiftId: "a-mp-1-2026-10-13" },
};

const findings = findingsOfEveryKindFixture();
const LONG_SHIFT = {
	shiftId: "s-long",
	name: "Front Desk Afternoon",
	group: "Morning",
	colour: "#DC6B47",
	startTime: "14:00",
	endTime: "22:00",
	unpaidBreakMinutes: 0,
	carriesOvertime: false,
};

/** The engine's findings marked on Ben's row, Friday and Saturday, and Chen's Sunday. */
export const WithFindings: Story = {
	args: {
		findings: {
			placed: placeFindings(findings, daysOf("2026-10-12")),
			names: findingNames(findings, {
				assignments: scheduleAssignmentsFixture(),
				shifts: [],
				constraints: [],
			}),
			onShowAll: fn(),
		},
	},
};

const notedWeek = scheduleAssignmentsFixture().map((assignment, index) => {
	if (index === 1)
		return {
			...assignment,
			flag: "LEAVE_REQUESTED" as const,
			leaveRequestId: "r1",
			leaveTypeName: "Annual leave",
		};
	if (index === 2)
		return {
			...assignment,
			flag: "ON_LEAVE_WHILE_ROSTERED" as const,
			leaveRequestId: "r2",
			leaveTypeName: "Medical",
			uncoveredShift: assignment.shift,
		};
	if (index === 5) return { ...assignment, uncoveredShift: LONG_SHIFT };
	return assignment;
});

/** A leave note is a router link, so its story needs a router. */
const withRouter: Decorator = (Story) => {
	const router = createRouter({
		routeTree: createRootRoute({ component: () => <Story /> }),
		history: createMemoryHistory(),
	});
	return <RouterProvider router={router} />;
};

/** What the leave records add under a tile: leave requested, on leave, and a shift left short. */
export const WithDayNotes: Story = {
	decorators: [withRouter],
	args: {
		rows: rosterFromAssignments(notedWeek, {
			start: "2026-10-12",
			end: "2026-10-18",
		}),
		viewerMembershipId: "someone-else",
	},
};
