import type { Meta, StoryObj } from "@storybook/react-vite";
import { withMemoryRouter } from "@/components/utils/MemoryRouterHarness";
import { ScheduleCard } from "@/features/scheduling/ScheduleCard";
import { exampleSchedules } from "@/features/scheduling/schedules";
import "@/common/i18n";

const [schedule] = exampleSchedules(new Date()).current;

const meta = {
	title: "Features/Scheduling/ScheduleCard",
	component: ScheduleCard,
	decorators: [withMemoryRouter],
	args: { schedule: schedule!, className: "w-96" },
} satisfies Meta<typeof ScheduleCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Pending: Story = {};

export const LowCoverage: Story = {
	args: {
		schedule: { ...schedule!, coverage: 84.7, openShifts: 11, conflicts: 4 },
	},
};

export const Processing: Story = {
	args: {
		schedule: {
			...schedule!,
			status: "PROCESSING",
			coverage: undefined,
			openShifts: undefined,
			conflicts: undefined,
		},
	},
};
