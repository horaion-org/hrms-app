import { QueryClient } from "@tanstack/react-query";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { Callout } from "@/components/ui/Callout";
import { storyProviders } from "@/features/organisation/storyApi";
import { monthChoicesFrom } from "@/features/scheduling/months/monthWeeks";
import { MonthSetupStep } from "@/features/scheduling/MonthSetupStep";
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
			month: "2026-11",
			includeLeave: true,
			allowOpenShifts: false,
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
