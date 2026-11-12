import { QueryClient } from "@tanstack/react-query";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { effectiveWorkspace } from "@/common/testing/effectiveWorkspace";
import { storyProviders } from "@/features/organisation/storyApi";
import {
	COMPANY_CONSTRAINT_FIXTURES,
	CONSTRAINT_OPTIONS,
	WEEKLY_RULE_FIXTURE,
} from "@/features/scheduling/constraints/fixtures";
import {
	policyConstraintsQuery,
	policyOptionsQuery,
} from "@/features/scheduling/policy/api";
import { SchedulingPolicySettings } from "@/features/settings/SchedulingPolicySettings";
import { workspaceQuery } from "@/features/workspace/api";

const COMPANY = "story-company";
const client = new QueryClient({
	defaultOptions: { queries: { retry: false, staleTime: Infinity } },
});

const meta = {
	title: "Features/Settings/SchedulingPolicySettings",
	component: SchedulingPolicySettings,
	parameters: { layout: "padded" },
	args: { companyId: COMPANY },
	decorators: [storyProviders(client)],
	beforeEach: ({ parameters }): void => {
		client.setQueryData(
			workspaceQuery.queryKey,
			effectiveWorkspace({
				companies: [
					{
						uuid: COMPANY,
						name: "Story company",
						permissions: (parameters["permissions"] as
							Array<string> | undefined) ?? [
							"scheduling_policy:read",
							"scheduling_policy:update",
						],
						branches: [],
					},
				],
			})
		);
		client.setQueryData(
			policyConstraintsQuery(COMPANY).queryKey,
			(parameters["constraints"] as
				typeof COMPANY_CONSTRAINT_FIXTURES | undefined) ??
				COMPANY_CONSTRAINT_FIXTURES
		);
		client.setQueryData(
			policyOptionsQuery(COMPANY).queryKey,
			CONSTRAINT_OPTIONS
		);
	},
} satisfies Meta<typeof SchedulingPolicySettings>;

export default meta;

type Story = StoryObj<typeof meta>;

/** A locked rest constraint and a default on weekends, editable. */
export const Editable: Story = {};

/** With the weekly rule the system adds: "Always applies" in place of its lock, and no Delete. */
export const WithWeeklyRule: Story = {
	parameters: {
		constraints: [...COMPANY_CONSTRAINT_FIXTURES, WEEKLY_RULE_FIXTURE],
	},
};

/** Read-only: scheduling_policy:read without :update. */
export const ReadOnly: Story = {
	parameters: { permissions: ["scheduling_policy:read"] },
};

/** No company-wide constraints yet. */
export const Empty: Story = { parameters: { constraints: [] } };
