import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactNode } from "react";
import { fn } from "storybook/test";
import { Button } from "@/components/ui/Button";
import { BeforeGeneratePanel } from "@/features/scheduling/months/BeforeGeneratePanel";
import { monthGenerationCheckFixture } from "@/features/scheduling/months/fixtures";
import "@/common/i18n";

const link = (label: string): ReactNode => (
	<Button variant="textlink">{label}</Button>
);

const meta = {
	title: "Features/Scheduling/Months/BeforeGeneratePanel",
	component: BeforeGeneratePanel,
	args: {
		check: monthGenerationCheckFixture(),
		month: "2026-12",
		links: { shifts: link, constraints: link, leave: link },
		generating: false,
		onGenerate: fn(),
	},
} satisfies Meta<typeof BeforeGeneratePanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const ReadyWithLeave: Story = {};
export const NoApprovedLeaveAndTwoWaiting: Story = {
	args: {
		check: monthGenerationCheckFixture({
			peopleWithApprovedLeave: 0,
			leaveRequestsWaiting: 2,
		}),
	},
};
export const NoStaffingConstraint: Story = {
	args: {
		check: monthGenerationCheckFixture({
			ready: false,
			missing: ["STAFFING_CONSTRAINT"],
			staffingConstraint: null,
		}),
	},
};
export const NoShift: Story = {
	args: {
		check: monthGenerationCheckFixture({
			ready: false,
			missing: ["SHIFT", "STAFFING_CONSTRAINT"],
			shiftCount: 0,
			staffingConstraint: null,
		}),
	},
};
export const BlockedByANote: Story = {
	args: { blockedNote: "You can’t create schedules at Kitchen." },
};
export const Generating: Story = { args: { generating: true } };
