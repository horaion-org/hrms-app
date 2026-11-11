import type { ReactElement } from "react";
import { I18nextProvider } from "react-i18next";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { authTestI18n } from "@/features/auth/testingI18n";
import { scheduleAssignmentsFixture } from "@/features/scheduling/schedules/fixtures";
import { CellNow } from "./CellNow";

const roster = scheduleAssignmentsFixture();
const working = roster[0]!;
const onLeave = roster.find((row) => row.offReason === "LEAVE")!;

const meta = {
	title: "Features/Scheduling/RosterCellPanel/CellNow",
	component: CellNow,
	decorators: [
		(Story): ReactElement => (
			<I18nextProvider i18n={authTestI18n}>
				<div className="max-w-96 p-4">
					<Story />
				</div>
			</I18nextProvider>
		),
	],
	args: {
		assignment: working,
		leaveDay: false,
		requestLink: undefined,
		requestDays: 1,
		language: "en",
	},
} satisfies Meta<typeof CellNow>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A working day: its shift, time and job title. */
export const WorkingDay: Story = {};

/** A leave day, read-only to this viewer. */
export const LeaveDay: Story = {
	args: { assignment: onLeave, leaveDay: true },
};

/** A day someone changed by hand: who, when, from what and why. */
export const ChangedByHand: Story = {
	args: {
		assignment: {
			...working,
			lastChange: {
				changeId: "c-1",
				appliedAt: "2026-10-10T09:00:00Z",
				appliedBy: { membershipId: "m-9", displayName: "Dana Lim" },
				before: { kind: "OFF", dayType: "OFF", shift: null, jobTitle: null },
				remark: "Covering for Ben",
				reason: null,
			},
		},
	},
};
