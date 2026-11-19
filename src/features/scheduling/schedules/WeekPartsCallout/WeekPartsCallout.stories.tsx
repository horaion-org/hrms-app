import type { Meta, StoryObj } from "@storybook/react-vite";
import { withMemoryRouter } from "@/components/utils/MemoryRouterHarness";
import { WeekPartsCallout } from "@/features/scheduling/schedules/WeekPartsCallout";
import "@/common/i18n";

const meta = {
	title: "Features/Scheduling/Schedules/WeekPartsCallout",
	component: WeekPartsCallout,
	decorators: [withMemoryRouter],
	args: {
		departmentId: "d-1",
		mayCreateHere: true,
		lines: [
			{ text: "Feb 15 – 16, 2027 have no schedule." },
			{
				text: "Feb 20 – 21, 2027 are a separate part of the roster.",
				action: {
					kind: "openSchedule",
					part: { scheduleId: "s-2", state: "TO_REVIEW" },
					label: "Open Feb 20 – 21, 2027",
				},
			},
		],
	},
} satisfies Meta<typeof WeekPartsCallout>;

export default meta;

type Story = StoryObj<typeof meta>;

/** The days before held by none, the days after by another schedule, linked. */
export const AnotherScheduleAfter: Story = {};

/** The days after still to schedule, with the button that schedules them. */
export const DaysToScheduleLater: Story = {
	args: {
		lines: [
			{
				text: "This schedule covers Feb 17 – 19, 2027. Feb 20 – 21, 2027 can be scheduled later.",
				action: {
					kind: "scheduleDays",
					days: { from: "2027-02-20", to: "2027-02-21" },
					label: "Schedule Feb 20 – 21, 2027",
				},
			},
		],
	},
};
