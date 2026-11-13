import { QueryClient } from "@tanstack/react-query";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { effectiveWorkspace } from "@/common/testing/effectiveWorkspace";
import {
	leaveDurationCatalogueQuery,
	type ManagedLeaveDuration,
} from "@/features/leaveDurations/api";
import { LEAVE_DURATION_CATALOGUE_FIXTURE } from "@/features/leaveDurations/fixtures";
import {
	storyCompanyRoute,
	storyProviders,
} from "@/features/organisation/storyApi";
import { LeaveDurationsSettings } from "@/features/settings/LeaveDurationsSettings";
import { workspaceQuery } from "@/features/workspace/api";

const COMPANY = "story-company";
const BOTH_KEYS = ["leave_duration:read", "leave_duration:update"];
const client = new QueryClient({
	defaultOptions: { queries: { retry: false, staleTime: Infinity } },
});

/** Every duration editable, as a company admin reads them. */
const COMPANY_ADMIN_ROWS = LEAVE_DURATION_CATALOGUE_FIXTURE.map((duration) => ({
	...duration,
	canEdit: true,
}));

type Parameters = {
	/** Keys held company-wide. */
	companyKeys?: Array<string>;
	/** Keys held at Kitchen only. */
	kitchenKeys?: Array<string>;
	durations?: Array<ManagedLeaveDuration>;
};

const meta = {
	title: "Features/Settings/LeaveDurationsSettings",
	component: LeaveDurationsSettings,
	parameters: { layout: "padded" },
	args: { companyId: COMPANY },
	// Decorators wrap outward: the route sits inside the query client the card reads.
	decorators: [storyCompanyRoute(COMPANY), storyProviders(client)],
	beforeEach: ({ parameters }): void => {
		const given = parameters as Parameters;
		client.setQueryData(
			workspaceQuery.queryKey,
			effectiveWorkspace({
				companies: [
					{
						uuid: COMPANY,
						name: "Story company",
						permissions: given.companyKeys ?? BOTH_KEYS,
						branches: [
							{
								uuid: "b-orchard",
								name: "Orchard",
								status: "ACTIVE",
								country: "SG",
								permissions: [],
								departments: [
									{
										uuid: "d-kitchen",
										name: "Kitchen",
										status: "ACTIVE",
										permissions: given.kitchenKeys ?? [],
									},
									{
										uuid: "d-bar",
										name: "Bar",
										status: "ACTIVE",
										permissions: [],
									},
								],
							},
						],
					},
				],
			})
		);
		client.setQueryData(
			leaveDurationCatalogueQuery(COMPANY).queryKey,
			given.durations ?? COMPANY_ADMIN_ROWS
		);
	},
} satisfies Meta<typeof LeaveDurationsSettings>;

export default meta;

type Story = StoryObj<typeof meta>;

/** A company admin: three durations, each with its actions, and the order arrows. */
export const CompanyAdmin: Story = {};

/** Kitchen's admin: the whole company's and the branch's durations are locked; Kitchen's prep is theirs. */
export const DepartmentAdmin: Story = {
	parameters: {
		companyKeys: [],
		kitchenKeys: BOTH_KEYS,
		durations: LEAVE_DURATION_CATALOGUE_FIXTURE,
	},
};

/** Read-only: leave_duration:read without :update. */
export const ReadOnly: Story = {
	parameters: { companyKeys: ["leave_duration:read"] },
};

/** No durations yet. */
export const Empty: Story = {
	parameters: { durations: [] },
};
