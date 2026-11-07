import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";
import {
	createMemoryHistory,
	createRootRoute,
	createRouter,
	RouterProvider,
} from "@tanstack/react-router";
import { RosterDayNotes } from "@/features/scheduling/RosterDayNotes";
import { findingNames } from "@/features/scheduling/roster/findings/findingNames";
import {
	generationFindingsFixture,
	scheduleAssignmentsFixture,
} from "@/features/scheduling/schedules/fixtures";
import "@/common/i18n";

/** The leave line links to Leave, so the story needs a router. */
const withRouter: Decorator = (Story) => {
	const router = createRouter({
		routeTree: createRootRoute({
			component: () => (
				<div className="w-80">
					<Story />
				</div>
			),
		}),
		history: createMemoryHistory(),
	});
	return <RouterProvider router={router} />;
};

const findings = generationFindingsFixture();

const meta = {
	title: "Features/Scheduling/RosterDayNotes",
	component: RosterDayNotes,
	decorators: [withRouter],
	args: { membershipId: "m-3", viewerMembershipId: "someone-else" },
} satisfies Meta<typeof RosterDayNotes>;

export default meta;

type Story = StoryObj<typeof meta>;

/** A colleague's leave request, with the link to review it in Leave. */
export const LeaveRequested: Story = {
	args: {
		note: {
			flag: "LEAVE_REQUESTED",
			leaveRequestId: "r1",
			leaveTypeName: "Annual leave",
		},
	},
};

/** What the engine left on Chen's Sunday, then the shift his absence leaves short. */
export const FindingAndShortShift: Story = {
	args: {
		note: { uncoveredShiftName: "Swing Shift" },
		findings: {
			list: [
				{
					kind: "message",
					date: "2026-10-18",
					message: "Chen Wei covers the Sunday swing alone.",
				},
			],
			names: findingNames(findings, {
				assignments: scheduleAssignmentsFixture(),
				shifts: [],
				constraints: [],
			}),
		},
	},
};

/** A day to decide, as a read-only panel says it (the editor says it in its own words). */
export const DayToDecide: Story = {
	args: { note: { flag: "NEEDS_DECISION" } },
};
