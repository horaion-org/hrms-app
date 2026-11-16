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

/** Shift names to vary the long list's copies by. */
const COPY_NAMES = ["Early", "Late", "Night", "Weekend"];

/**
 * About 30 constraints across the four purposes: each live one copied under
 * four shift names, some "If possible", one switched off, and three whose
 * values no longer fit, so they need attention.
 */
const LONG_LIST = CONSTRAINT_FIXTURES.flatMap((constraint) =>
	COPY_NAMES.map((copyName, index) => ({
		...constraint,
		constraintId: `${constraint.constraintId}-${index}`,
		name: `${constraint.name} (${copyName})`,
		requirement:
			constraint.requirement && index % 2 === 1
				? "SHOULD"
				: constraint.requirement,
		status:
			index === 3 && constraint.category === "WORKING_HOURS"
				? "INACTIVE"
				: constraint.status,
		values:
			index === 2 && constraint.category !== "WORKING_HOURS"
				? constraint.values.map((value, valueIndex) =>
						valueIndex === 0
							? { ...value, problem: "UNAVAILABLE" as const }
							: value
					)
				: constraint.values,
	}))
);

/** A long list: with more than twelve constraints in view, only the sections needing attention start open. */
export const LongList: Story = {
	beforeEach: (): void => {
		try {
			window.localStorage.removeItem("horaion.constraintSectionsClosed");
		} catch {
			// Storage is blocked: the sections start as the rule says anyway.
		}
		client.setQueryData(
			companyConstraintsQuery(COMPANY, units.branch?.branchId).queryKey,
			[...COMPANY_CONSTRAINT_FIXTURES, ...LONG_LIST]
		);
	},
};
