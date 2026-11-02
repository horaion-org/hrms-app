import type { Meta, StoryObj } from "@storybook/react-vite";
import { withMemoryRouter } from "@/components/utils/MemoryRouterHarness";
import { ScheduleCard } from "@/features/scheduling/ScheduleCard";
import {
	scheduleFixture,
	generatedScheduleFixture,
} from "@/features/scheduling/schedules/fixtures";
import "@/common/i18n";

const meta = {
	title: "Features/Scheduling/ScheduleCard",
	component: ScheduleCard,
	decorators: [withMemoryRouter],
	args: { schedule: scheduleFixture(), className: "w-96" },
} satisfies Meta<typeof ScheduleCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const SavedDraft: Story = {};

export const GenerationRequested: Story = {
	args: { schedule: generatedScheduleFixture() },
};

export const Generated: Story = {
	args: { schedule: generatedScheduleFixture({ status: "GENERATED" }) },
};
