import { act, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { configureApiClient, resetApiClient } from "@/common/api-client";
import type { FunctionComponent } from "@/common/types";
import { envelope, stubApi } from "@/common/testing/stubApi";
import {
	useCreateAccessRole,
	useCreateDepartment,
	useCreateJobTitle,
} from "@/features/organisation/useCreateInOrganisation";

beforeEach(() => {
	configureApiClient({
		accessToken: () => Promise.resolve("test-pass"),
		renew: () => Promise.resolve({ kind: "expired" }),
		onUnauthenticated: () => {},
	});
});
afterEach(() => {
	resetApiClient();
	vi.unstubAllGlobals();
});

const department = {
	departmentId: "d-1",
	name: "Bar",
	status: "ACTIVE",
};
const jobTitle = { jobTitleId: "j-1", name: "Chef", status: "ACTIVE" };
const role = {
	accessRoleId: "r-1",
	name: "Auditor",
	protectedRole: false,
	holderCount: 0,
	permissions: ["audit_event:read"],
};

it.each([
	[
		"department",
		"POST /api/v1/companies/c-1/branches/b-1/departments",
		department,
		(): unknown => useCreateDepartment("c-1"),
		{
			branchId: "b-1",
			body: { name: "Bar", initialHeadCompanyMembershipIds: ["m-1"] },
		},
	],
	[
		"job title",
		"POST /api/v1/companies/c-1/job-titles",
		jobTitle,
		(): unknown => useCreateJobTitle("c-1"),
		{ name: "Chef" },
	],
	[
		"system role",
		"POST /api/v1/companies/c-1/access-roles",
		role,
		(): unknown => useCreateAccessRole("c-1"),
		{ name: "Auditor", permissions: ["audit_event:read"] },
	],
])(
	"creating a %s invalidates this company's lists and overview only",
	async (_name, route, reply, hook, variables) => {
		stubApi({ [route]: { status: 201, body: envelope(reply) } });
		const client = new QueryClient();
		const own = ["organisation", "c-1", "job-titles"];
		const overview = ["organisation", "c-1", "recent-activity"];
		const otherCompany = ["organisation", "c-2", "job-titles"];
		for (const key of [own, overview, otherCompany])
			client.setQueryData(key, []);
		const wrapper = ({
			children,
		}: {
			children: ReactNode;
		}): FunctionComponent => (
			<QueryClientProvider client={client}>{children}</QueryClientProvider>
		);
		const { result, unmount } = renderHook(hook, { wrapper });
		await act(async () => {
			await (
				result.current as { mutateAsync: (body: unknown) => Promise<unknown> }
			).mutateAsync(variables);
		});
		expect(client.getQueryState(own)?.isInvalidated).toBe(true);
		expect(client.getQueryState(overview)?.isInvalidated).toBe(true);
		expect(client.getQueryState(otherCompany)?.isInvalidated).toBe(false);
		unmount();
		client.clear();
	}
);
