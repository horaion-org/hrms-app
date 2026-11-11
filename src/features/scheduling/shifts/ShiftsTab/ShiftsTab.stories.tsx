import { QueryClient } from "@tanstack/react-query";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { storyProviders } from "@/features/organisation/storyApi";
import { storyCompany } from "@/features/people/storyCompany";
import {
	SCHEDULING_BRANCHES,
	schedulingWorkspace,
} from "@/features/scheduling/schedules/fixtures";
import { SCHEDULING_UNIT_RULES } from "@/features/scheduling/schedules/schedulesUnitRules";
import { companyShiftsQuery } from "@/features/scheduling/shifts/api";
import {
	SHIFT_FIXTURES,
	departmentShiftFixture,
} from "@/features/scheduling/shifts/fixtures";
import { ShiftsTab } from "@/features/scheduling/shifts/ShiftsTab";
import { SHIFT_READ_KEYS } from "@/features/workspace/permissionKeys";
import { resolveWorkspaceUnits } from "@/features/workspace/unitSelection";

const COMPANY = "c-1";
const PERMISSIONS = [
	"shift:read",
	"shift:create",
	"shift:update",
	"shift:delete",
];
const units = resolveWorkspaceUnits(
	schedulingWorkspace(PERMISSIONS),
	COMPANY,
	SHIFT_READ_KEYS,
	{},
	SCHEDULING_UNIT_RULES
);
/** Main branch's shifts, every other one in Kitchen (d-2). */
const shifts = SHIFT_FIXTURES.map((shift, index) => ({
	...departmentShiftFixture(shift),
	...(index % 2 === 1 && { departmentId: "d-2", departmentName: "Kitchen" }),
}));
const client = new QueryClient({
	defaultOptions: { queries: { retry: false, staleTime: Infinity } },
});

const meta = {
	title: "Features/Scheduling/Shifts/ShiftsTab",
	component: ShiftsTab,
	parameters: { layout: "padded", permissions: PERMISSIONS },
	args: { companyId: COMPANY, units, onDepartmentChange: fn() },
	decorators: [
		storyCompany(client, COMPANY, SCHEDULING_BRANCHES),
		storyProviders(client),
	],
	beforeEach: (): void => {
		client.setQueryData(
			companyShiftsQuery(COMPANY, units.branch?.branchId).queryKey,
			shifts
		);
	},
} satisfies Meta<typeof ShiftsTab>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Every department of Main branch: each row names its Department. */
export const AllDepartments: Story = {};
