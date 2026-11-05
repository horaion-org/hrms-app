import { QueryClient } from "@tanstack/react-query";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { effectiveWorkspace } from "@/common/testing/effectiveWorkspace";
import {
	termsOverviewQuery,
	termsPresetsQuery,
} from "@/features/employmentTerms/api";
import {
	TERMS_OVERVIEW,
	TERMS_PRESETS,
} from "@/features/employmentTerms/fixtures";
import { storyProviders } from "@/features/organisation/storyApi";
import { EmploymentTermsSettings } from "@/features/settings/EmploymentTermsSettings";
import { workspaceQuery } from "@/features/workspace/api";

const COMPANY = "story-company";
const client = new QueryClient({
	defaultOptions: { queries: { retry: false, staleTime: Infinity } },
});

const meta = {
	title: "Features/Settings/EmploymentTermsSettings",
	component: EmploymentTermsSettings,
	parameters: { layout: "padded" },
	args: { companyId: COMPANY, onTermsClosed: (): void => {} },
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
							"employment_terms:read",
							"employment_terms:update",
						],
						branches: [],
					},
				],
			})
		);
		client.setQueryData(termsOverviewQuery(COMPANY).queryKey, TERMS_OVERVIEW);
		client.setQueryData(termsPresetsQuery(COMPANY).queryKey, TERMS_PRESETS);
	},
} satisfies Meta<typeof EmploymentTermsSettings>;

export default meta;

type Story = StoryObj<typeof meta>;

/** The seeded Standard week as the Default, with terms people hold and an inactive one. */
export const Editable: Story = {};

/** Read-only: employment_terms:read without :update. */
export const ReadOnly: Story = {
	parameters: { permissions: ["employment_terms:read"] },
};
