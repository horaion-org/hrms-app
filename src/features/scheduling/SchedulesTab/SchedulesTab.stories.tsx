import { QueryClient } from "@tanstack/react-query";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { storyProviders } from "@/features/organisation/storyApi";
import { storyCompany } from "@/features/people/storyCompany";
import { SchedulesTab } from "@/features/scheduling/SchedulesTab";
import { schedulesInUnitsKey } from "@/features/scheduling/schedules/api";
import {
	generatedScheduleFixture,
	SCHEDULING_BRANCHES,
	scheduleFixture,
	schedulingWorkspace,
} from "@/features/scheduling/schedules/fixtures";
import { SCHEDULING_UNIT_RULES } from "@/features/scheduling/schedules/schedulesUnitRules";
import { SCHEDULE_READ_KEYS } from "@/features/workspace/permissionKeys";
import {
	resolveWorkspaceUnits,
	selectedUnits,
} from "@/features/workspace/unitSelection";

const COMPANY = "c-1";
const PERMISSIONS = ["schedule:read", "schedule:create"];
const units = resolveWorkspaceUnits(
	schedulingWorkspace(PERMISSIONS),
	COMPANY,
	SCHEDULE_READ_KEYS,
	{},
	SCHEDULING_UNIT_RULES
);
const client = new QueryClient({
	defaultOptions: { queries: { retry: false, staleTime: Infinity } },
});

const meta = {
	title: "Features/Scheduling/SchedulesTab",
	component: SchedulesTab,
	parameters: { layout: "padded", permissions: PERMISSIONS },
	args: { companyId: COMPANY, units, onDepartmentChange: fn() },
	decorators: [
		storyCompany(client, COMPANY, SCHEDULING_BRANCHES),
		storyProviders(client),
	],
	beforeEach: (): void => {
		client.setQueryData(schedulesInUnitsKey(COMPANY, selectedUnits(units)), [
			scheduleFixture(),
			generatedScheduleFixture({
				scheduleId: "s-2",
				name: "Kitchen - Week 41",
			}),
		]);
	},
} satisfies Meta<typeof SchedulesTab>;

export default meta;

type Story = StoryObj<typeof meta>;

/** A draft and a generated schedule in Main branch: a card each and the history table. */
export const Default: Story = {};
