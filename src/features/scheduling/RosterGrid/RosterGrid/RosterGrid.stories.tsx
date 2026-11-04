import type { Meta, StoryObj } from "@storybook/react-vite";
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
