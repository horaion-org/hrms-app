import type { Meta, StoryObj } from "@storybook/react-vite";
import { withMemoryRouter } from "@/components/utils/MemoryRouterHarness";
import { ScheduleCard } from "@/features/scheduling/ScheduleCard";
import { exampleSchedules } from "@/features/scheduling/schedules";
import {
	scheduleFixture,
	generatedScheduleFixture,
} from "@/features/scheduling/schedules/fixtures";
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

const draft = scheduleFixture();
export const SavedDraft: Story = {
	args: {
		schedule: {
			...schedule!,
			scheduleId: draft.scheduleId,
			departmentId: draft.departmentId,
			code: draft.name,
			status: draft.status,
			period: { start: draft.periodStart, end: draft.periodEnd },
		},
		details: draft,
	},
};

export const GenerationRequested: Story = {
	args: {
		...SavedDraft.args,
		schedule: { ...SavedDraft.args!.schedule!, status: "GENERATION_REQUESTED" },
		details: generatedScheduleFixture(),
	},
};

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
