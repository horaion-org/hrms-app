import { QueryClient } from "@tanstack/react-query";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { Callout } from "@/components/ui/Callout";
import { storyProviders } from "@/features/organisation/storyApi";
import { monthChoicesFrom } from "@/features/scheduling/months/monthWeeks";
import {
	defaultTicksOf,
	tickableWeeksOf,
} from "@/features/scheduling/months/weekTicks";
import {
	datesPlanFixture,
	datesPlanRedoingFixture,
	datesPlanWithKeptWeekFixture,
} from "@/features/scheduling/dates/fixtures";
import { MonthSetupStep } from "@/features/scheduling/createSchedule/MonthSetupStep";
import { schedulingWorkspace } from "@/features/scheduling/schedules/fixtures";
import { workspaceQuery } from "@/features/workspace/api";

/** A client whose workspace grants `permissions` company-wide. */
const clientWith = (permissions: Array<string>): QueryClient => {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false, staleTime: Infinity } },
	});
	client.setQueryData(
		workspaceQuery.queryKey,
		schedulingWorkspace(permissions)
	);
	return client;
};

const meta = {
	title: "Features/Scheduling/MonthSetupStep",
	component: MonthSetupStep,
	parameters: { layout: "padded" },
	args: {
		formId: "month-setup",
		companyId: "c-1",
		defaultValues: {
			departmentId: "",
			scheduleFor: "month",
			month: "2026-11",
			firstDay: "",
			lastDay: "",
			name: "",
			includeLeave: true,
		},
		// Thursday 12 Nov 2026: November and the twelve months after it.
		months: monthChoicesFrom(new Date(2026, 10, 12)),
		onDepartmentChange: fn(),
		onMonthChange: fn(),
		onSubmit: fn(),
	},
	decorators: [
		storyProviders(clientWith(["schedule:read", "schedule:create"])),
	],
} satisfies Meta<typeof MonthSetupStep>;

export default meta;

type Story = StoryObj<typeof meta>;

/** First visit: November, five weeks, no Department yet. */
export const FirstVisit: Story = {};

/** A Department that isn't ready: the page's readiness gate sits under the fields. */
export const DepartmentNotReady: Story = {
	args: {
		defaultValues: { ...meta.args.defaultValues, departmentId: "d-1" },
		departmentExtras: (
			<Callout tone="warning">
				Front Office has no staffing constraint yet, so nothing can be
				generated.
			</Callout>
		),
	},
};

/** Front Desk's November on Tuesday 17 Nov, as the mock-up shows it. */
const FRONT_DESK_NOVEMBER = tickableWeeksOf(
	[
		{ periodStart: "2026-11-02", state: "PUBLISHED" },
		{ periodStart: "2026-11-09", state: "PUBLISHED" },
		{ periodStart: "2026-11-16", state: "TO_REVIEW" },
		{ periodStart: "2026-11-23", state: "TO_REVIEW" },
		{ periodStart: "2026-11-30", state: "NOT_GENERATED" },
	],
	"2026-11-17"
);

/**
 * Mid-week, some weeks done: two weeks published, two waiting for review
 * (unticked), and the week of 30 Nov ticked.
 */
export const MidWeekSomeWeeksDone: Story = {
	args: {
		defaultValues: { ...meta.args.defaultValues, departmentId: "d-1" },
		weeks: {
			rows: FRONT_DESK_NOVEMBER,
			ticked: defaultTicksOf(FRONT_DESK_NOVEMBER),
			onTickedChange: fn(),
		},
	},
};

/** December: four weeks; the week of 30 Nov belongs to November. */
export const December: Story = {
	args: {
		defaultValues: { ...meta.args.defaultValues, month: "2026-12" },
		usesLine: (
			<p className="text-sm text-neutral-800">
				Uses all 3 shifts and 5 constraints of Front Office.
			</p>
		),
	},
};

/** The design's example by dates: Thursday 19 to Saturday 28 November, nothing rostered before. */
export const DatesNothingRostered: Story = {
	name: "Dates, nothing rostered",
	args: {
		defaultValues: {
			...meta.args.defaultValues,
			departmentId: "d-1",
			scheduleFor: "dates",
			firstDay: "2026-11-19",
			lastDay: "2026-11-28",
			name: "Year-end gala",
		},
		dates: { plan: datesPlanFixture(), pending: false, today: "2026-11-17" },
	},
};

/** The same dates with the week of 23 Nov already published: it is kept. */
export const DatesThisWeekPublished: Story = {
	name: "Dates, this week published",
	args: {
		defaultValues: {
			...meta.args.defaultValues,
			departmentId: "d-1",
			scheduleFor: "dates",
			firstDay: "2026-11-19",
			lastDay: "2026-11-28",
		},
		dates: {
			plan: datesPlanWithKeptWeekFixture(),
			pending: false,
			today: "2026-11-17",
		},
	},
};

/** The owner's example: a generated week, Wed 18 – Thu 19 asked; the rest of the week is scheduled again. */
export const DatesRedo: Story = {
	name: "Dates, redo",
	args: {
		defaultValues: {
			...meta.args.defaultValues,
			departmentId: "d-1",
			scheduleFor: "dates",
			firstDay: "2026-11-18",
			lastDay: "2026-11-19",
		},
		dates: {
			plan: datesPlanRedoingFixture(),
			pending: false,
			today: "2026-11-17",
		},
	},
};
