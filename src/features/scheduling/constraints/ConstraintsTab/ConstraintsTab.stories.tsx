import { QueryClient } from "@tanstack/react-query";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { storyProviders } from "@/features/organisation/storyApi";
import { storyCompany } from "@/features/people/storyCompany";
import { companyConstraintsQuery } from "@/features/scheduling/constraints/api";
import { ConstraintsTab } from "@/features/scheduling/constraints/ConstraintsTab";
import {
	COMPANY_CONSTRAINT_FIXTURES,
	CONSTRAINT_FIXTURES,
} from "@/features/scheduling/constraints/fixtures";
import {
	SCHEDULING_BRANCHES,
	schedulingWorkspace,
} from "@/features/scheduling/schedules/fixtures";
import { SCHEDULING_UNIT_RULES } from "@/features/scheduling/schedules/schedulesUnitRules";
import { resolveWorkspaceUnits } from "@/features/workspace/unitSelection";

const COMPANY = "c-1";
const PERMISSIONS = [
	"constraint:read",
	"constraint:create",
	"constraint:update",
	"constraint:delete",
];
const units = resolveWorkspaceUnits(
	schedulingWorkspace(PERMISSIONS),
	COMPANY,
	["constraint:read"],
	{},
	SCHEDULING_UNIT_RULES
);
const client = new QueryClient({
	defaultOptions: { queries: { retry: false, staleTime: Infinity } },
});

const meta = {
	title: "Features/Scheduling/Constraints/ConstraintsTab",
	component: ConstraintsTab,
	parameters: { layout: "padded", permissions: PERMISSIONS },
	args: { companyId: COMPANY, units, onDepartmentChange: fn() },
	decorators: [
		storyCompany(client, COMPANY, SCHEDULING_BRANCHES),
		storyProviders(client),
	],
	beforeEach: (): void => {
		client.setQueryData(
			companyConstraintsQuery(COMPANY, units.branch?.branchId).queryKey,
			[...COMPANY_CONSTRAINT_FIXTURES, ...CONSTRAINT_FIXTURES]
		);
	},
} satisfies Meta<typeof ConstraintsTab>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Every department of Main branch: company constraints once, reading "All departments", then Front Office's own. */
export const AllDepartments: Story = {};
