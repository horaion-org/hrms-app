import type { Meta, StoryObj } from "@storybook/react-vite";
import { withMemoryRouter } from "@/components/utils/MemoryRouterHarness";
import { approvalInstanceFixture } from "@/features/approvals/fixtures";
import type { WeekState, WeekSummary } from "@/features/scheduling/months/api";
import { monthSummaryFixture } from "@/features/scheduling/months/fixtures";
import { MonthCard } from "@/features/scheduling/months/MonthCard";
import "@/common/i18n";

/** One week of a month summary. */
const week = (
	periodStart: string,
	state: WeekState,
	scheduleId: string | null
): WeekSummary => ({ periodStart, state, scheduleId });

const meta = {
	title: "Features/Scheduling/Months/MonthCard",
	component: MonthCard,
	decorators: [withMemoryRouter],
	args: { summary: monthSummaryFixture(), waitingOnMe: [], className: "w-96" },
} satisfies Meta<typeof MonthCard>;

export default meta;

type Story = StoryObj<typeof meta>;

/** November: one published, the week under review, two tentative, one not generated yet. */
export const ReviewingMonth: Story = {};
export const AllPublished: Story = {
	args: {
		summary: monthSummaryFixture({
			weeks: [
				week("2026-11-02", "PUBLISHED", "s-1"),
				week("2026-11-09", "PUBLISHED", "s-2"),
				week("2026-11-16", "PUBLISHED", "s-3"),
				week("2026-11-23", "PUBLISHED", "s-4"),
				week("2026-11-30", "PUBLISHED", "s-5"),
			],
		}),
	},
};
export const GeneratedAhead: Story = {
	args: {
		summary: monthSummaryFixture({
			month: "2026-12",
			weeks: [
				week("2026-12-07", "TENTATIVE", "s-6"),
				week("2026-12-14", "TENTATIVE", "s-7"),
				week("2026-12-21", "NOT_GENERATED", null),
				week("2026-12-28", "NOT_GENERATED", null),
			],
		}),
		reviewMonth: "2026-11",
	},
};
export const MixedWithAFailedWeek: Story = {
	args: {
		summary: monthSummaryFixture({
			weeks: [
				week("2026-11-02", "PUBLISHED", "s-1"),
				week("2026-11-09", "FAILED", "s-2"),
				week("2026-11-16", "TO_REVIEW", "s-3"),
				week("2026-11-23", "DRAFT", "s-4"),
				week("2026-11-30", "NOT_GENERATED", null),
			],
		}),
	},
};
export const WaitingOnTheViewer: Story = {
	args: { waitingOnMe: [approvalInstanceFixture({ subjectId: "s-2" })] },
};
