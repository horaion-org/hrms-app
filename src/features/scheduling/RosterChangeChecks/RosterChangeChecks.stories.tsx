import type { Meta, StoryObj } from "@storybook/react-vite";
import { RosterChangeChecks } from "@/features/scheduling/RosterChangeChecks";
import { rosterCheckFixture } from "@/features/scheduling/rosterChanges/fixtures";
import "@/common/i18n";

const meta = {
	title: "Features/Scheduling/RosterChangeChecks",
	component: RosterChangeChecks,
	args: {
		names: {
			member: (): string => "Aisha Rahman",
			shift: (): string => "Front Desk AM",
			day: (): string => "Mon, Oct 12",
		},
		checks: [
			rosterCheckFixture({ code: "LEAVE_APPROVED", severity: "NEEDS_REMARK" }),
			rosterCheckFixture({
				code: "ROSTERED_ELSEWHERE",
				severity: "NEEDS_ACKNOWLEDGEMENT",
			}),
			rosterCheckFixture({ code: "WORKS_ON_DAY_OFF", severity: "INFO" }),
			rosterCheckFixture(),
		],
	},
} satisfies Meta<typeof RosterChangeChecks>;

export default meta;

type Story = StoryObj<typeof meta>;

/** A day given to someone on leave, on a schedule generated with leave ignored. */
export const Default: Story = {};

/** A change nothing stands against. */
export const NoProblems: Story = { args: { checks: [] } };

/** A change that can't be applied. */
export const Refused: Story = {
	args: {
		checks: [
			rosterCheckFixture({ code: "SHIFT_NOT_ON_DAY", severity: "REFUSED" }),
		],
	},
};
