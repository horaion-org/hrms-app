import { QueryClient } from "@tanstack/react-query";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { storyProviders } from "@/features/organisation/storyApi";
import { periodStartingOn } from "@/features/scheduling/periods";
import { schedulingWorkspace } from "@/features/scheduling/schedules/fixtures";
import { ScheduleSetupStep } from "@/features/scheduling/ScheduleSetupStep";
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
	title: "Features/Scheduling/ScheduleSetupStep",
	component: ScheduleSetupStep,
	parameters: { layout: "padded" },
	args: {
		formId: "setup",
		companyId: "c-1",
		defaultValues: {
			departmentId: "",
			name: "",
			periodStart: "2026-04-13",
			includeLeave: true,
			allowOpenShifts: false,
		},
		periods: ["2026-04-13", "2026-04-20", "2026-04-27"].map(periodStartingOn),
		onSubmit: fn(() => Promise.resolve(undefined)),
	},
	decorators: [
		storyProviders(clientWith(["schedule:read", "schedule:create"])),
	],
} satisfies Meta<typeof ScheduleSetupStep>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Schedules may be read but not created anywhere: the selector offers nothing and says why. */
export const NoDepartmentToCreateIn: Story = {
	decorators: [storyProviders(clientWith(["schedule:read"]))],
};

const savedDraft = {
	defaultValues: {
		departmentId: "d-1",
		name: "Front Office - Week 16",
		periodStart: "2026-04-13",
		includeLeave: true,
		allowOpenShifts: false,
	},
	lockedDepartment: {
		departmentId: "d-1",
		label: "Main branch › Front Office",
	},
};

export const SavedDraft: Story = { args: savedDraft };

/** A generated schedule, or a draft the person may not change. */
export const ReadOnly: Story = { args: { ...savedDraft, readOnly: true } };
