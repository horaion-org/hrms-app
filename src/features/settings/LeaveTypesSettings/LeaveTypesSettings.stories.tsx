import { QueryClient } from "@tanstack/react-query";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { effectiveWorkspace } from "@/common/testing/effectiveWorkspace";
import {
	leaveTypeCatalogueQuery,
	type ManagedLeaveType,
} from "@/features/leaveTypes/api";
import { LEAVE_TYPE_CATALOGUE_FIXTURE } from "@/features/leaveTypes/fixtures";
import { storyProviders } from "@/features/organisation/storyApi";
import { LeaveTypesSettings } from "@/features/settings/LeaveTypesSettings";
import { workspaceQuery } from "@/features/workspace/api";

const COMPANY = "story-company";
const client = new QueryClient({
	defaultOptions: { queries: { retry: false, staleTime: Infinity } },
});

const meta = {
	title: "Features/Settings/LeaveTypesSettings",
	component: LeaveTypesSettings,
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
							"leave_type:read",
							"leave_type:update",
						],
						branches: [],
					},
				],
			})
		);
		client.setQueryData(
			leaveTypeCatalogueQuery(COMPANY).queryKey,
			(parameters["types"] as Array<ManagedLeaveType> | undefined) ??
				LEAVE_TYPE_CATALOGUE_FIXTURE
		);
	},
} satisfies Meta<typeof LeaveTypesSettings>;

export default meta;

type Story = StoryObj<typeof meta>;

/** The day off, two yearly types, one per occasion and an inactive one, editable. */
export const Editable: Story = {};

/** Read-only: leave_type:read without :update. */
export const ReadOnly: Story = {
	parameters: { permissions: ["leave_type:read"] },
};

/** Every company type deactivated: only the day off is left. */
export const NothingActive: Story = {
	parameters: {
		types: LEAVE_TYPE_CATALOGUE_FIXTURE.map((type) =>
			type.system ? type : { ...type, status: "INACTIVE" }
		),
	},
};
