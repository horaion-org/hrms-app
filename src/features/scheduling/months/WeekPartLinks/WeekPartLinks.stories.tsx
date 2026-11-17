import type { Meta, StoryObj } from "@storybook/react-vite";
import { withMemoryRouter } from "@/components/utils/MemoryRouterHarness";
import { twoPartWeekFixture } from "@/features/scheduling/months/fixtures";
import { WeekPartLinks } from "@/features/scheduling/months/WeekPartLinks";
import "@/common/i18n";

const meta = {
	title: "Features/Scheduling/Months/WeekPartLinks",
	component: WeekPartLinks,
	decorators: [withMemoryRouter],
	args: { parts: twoPartWeekFixture(), departmentId: "d-1" },
} satisfies Meta<typeof WeekPartLinks>;

export default meta;

type Story = StoryObj<typeof meta>;

/** On a roster page: the open schedule marked as current, the other linked. */
export const OnARoster: Story = { args: { currentScheduleId: "s-1" } };

/** On a month card: every schedule linked. */
export const OnAWeekCard: Story = { args: { className: "w-60" } };
