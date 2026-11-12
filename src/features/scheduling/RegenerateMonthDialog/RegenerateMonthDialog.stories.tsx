import { QueryClient } from "@tanstack/react-query";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { storyProviders, stubStoryApi } from "@/features/organisation/storyApi";
import { storyCompany } from "@/features/people/storyCompany";
import type { MonthWeek } from "@/features/scheduling/months/api";
import {
	monthWeekFixture,
	scheduleMonthFixture,
} from "@/features/scheduling/months/fixtures";
import { RegenerateMonthDialog } from "@/features/scheduling/RegenerateMonthDialog";

const client = new QueryClient({
	defaultOptions: { queries: { retry: false } },
});

/** November's five weeks, Monday to Sunday. */
const NOVEMBER_WEEKS = [
	["2026-11-02", "2026-11-08"],
	["2026-11-09", "2026-11-15"],
	["2026-11-16", "2026-11-22"],
	["2026-11-23", "2026-11-29"],
	["2026-11-30", "2026-12-06"],
] as const;

/** November with every week tentative and covered, but for what `changes` sets by Monday. */
const november = (
	changes: Record<string, Partial<MonthWeek>> = {}
): ReturnType<typeof scheduleMonthFixture> =>
	scheduleMonthFixture({
		weeks: NOVEMBER_WEEKS.map(([periodStart, periodEnd], index) =>
			monthWeekFixture({
				periodStart,
				periodEnd,
				state: "TENTATIVE",
				scheduleId: `s-${index + 1}`,
				includedInMonthGeneration: true,
				...changes[periodStart],
			})
		),
	});

const meta = {
	title: "Features/Scheduling/RegenerateMonthDialog",
	component: RegenerateMonthDialog,
	args: {
		companyId: "c-1",
		month: november(),
		onClose: fn(),
	},
	decorators: [storyCompany(client, "c-1"), storyProviders(client)],
	parameters: { permissions: ["schedule:generate", "schedule:create"] },
} satisfies Meta<typeof RegenerateMonthDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Nothing published and nothing changed by hand: every week is worked out again. */
export const NothingPublished: Story = {};

/** The first week published and one changed by hand: asks in red. */
export const OnePublishedOneChangedByHand: Story = {
	args: {
		month: november({
			"2026-11-02": { state: "PUBLISHED", includedInMonthGeneration: false },
			"2026-11-16": { handChangedDays: 1 },
		}),
	},
};

/** Two weeks changed by hand, named together. */
export const TwoChangedByHand: Story = {
	args: {
		month: november({
			"2026-11-16": { handChangedDays: 1 },
			"2026-11-23": { handChangedDays: 2 },
		}),
	},
};

/** Confirming here is refused: the reason shows inside the dialog. */
export const ARefusal: Story = {
	beforeEach: (): (() => void) => stubStoryApi([], false, client),
};
