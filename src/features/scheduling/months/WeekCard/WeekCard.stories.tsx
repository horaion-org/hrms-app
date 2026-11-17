import type { Meta, StoryObj } from "@storybook/react-vite";
import { withMemoryRouter } from "@/components/utils/MemoryRouterHarness";
import {
	coverDays,
	monthWeekFixture,
} from "@/features/scheduling/months/fixtures";
import { WeekCard } from "@/features/scheduling/months/WeekCard";
import "@/common/i18n";

const noRoster = { days: [], handChangedDays: null };

const meta = {
	title: "Features/Scheduling/Months/WeekCard",
	component: WeekCard,
	decorators: [withMemoryRouter],
	args: { week: monthWeekFixture(), departmentId: "d-1", className: "w-60" },
} satisfies Meta<typeof WeekCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Published: Story = {};
export const ToReview: Story = {
	args: { week: monthWeekFixture({ state: "TO_REVIEW" }) },
};
export const ToReviewWithAShortDayAndAHandChange: Story = {
	args: {
		week: monthWeekFixture({
			state: "TO_REVIEW",
			days: coverDays("2026-11-02", { 1: 1 }),
			handChangedDays: 1,
		}),
	},
};
export const Tentative: Story = {
	args: { week: monthWeekFixture({ state: "TENTATIVE" }) },
};
export const Generating: Story = {
	args: { week: monthWeekFixture({ state: "GENERATING", ...noRoster }) },
};
export const GenerationFailed: Story = {
	args: { week: monthWeekFixture({ state: "FAILED", ...noRoster }) },
};
export const Rejected: Story = {
	args: { week: monthWeekFixture({ state: "REJECTED", ...noRoster }) },
};
export const Draft: Story = {
	args: { week: monthWeekFixture({ state: "DRAFT", ...noRoster }) },
};
export const NotGeneratedYet: Story = {
	args: {
		week: monthWeekFixture({
			state: "NOT_GENERATED",
			scheduleId: null,
			...noRoster,
		}),
	},
};
export const FailedWithItsReason: Story = {
	args: {
		week: monthWeekFixture({ state: "FAILED", ...noRoster }),
		failureMessage:
			"The scheduling engine couldn’t be reached in time, so nothing was generated.",
	},
};
export const RefusedByTheMonthRun: Story = {
	args: {
		week: monthWeekFixture({
			state: "NOT_GENERATED",
			scheduleId: null,
			...noRoster,
		}),
		refusal:
			"This department has no employees who can be scheduled. Give at least one active member of the department a job title, then try again.",
	},
};
/** A week in two parts: Monday to Wednesday published, the named rest to review. */
export const PublishedInPart: Story = {
	args: {
		week: monthWeekFixture({
			periodStart: "2026-11-23",
			periodEnd: "2026-11-29",
			state: "TO_REVIEW",
			coveredFrom: "2026-11-26",
			coveredTo: "2026-11-29",
			name: "Year-end gala",
			days: coverDays("2026-11-23").map((day, index) => ({
				...day,
				covered: index >= 3,
			})),
			parts: [
				{
					scheduleId: "s-1",
					name: "Week of 2026-11-23",
					named: false,
					coveredFrom: "2026-11-23",
					coveredTo: "2026-11-25",
					state: "PUBLISHED",
				},
				{
					scheduleId: "s-2",
					name: "Year-end gala",
					named: true,
					coveredFrom: "2026-11-26",
					coveredTo: "2026-11-29",
					state: "TO_REVIEW",
				},
			],
		}),
	},
};
