import { act, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { configureApiClient, resetApiClient } from "@/common/api-client";
import type { FunctionComponent } from "@/common/types";
import { envelope, stubApi } from "@/common/testing/stubApi";
import { useCreateAccessRole } from "@/features/accessRoles/useCreateAccessRole";

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

it("creating an access role invalidates this company's lists and overview only", async () => {
	stubApi({
		"POST /api/v1/companies/c-1/access-roles": {
			status: 201,
			body: envelope({
				accessRoleId: "r-1",
				name: "Auditor",
				protectedRole: false,
				kind: "COMPANY",
				status: "ACTIVE",
				holderCount: 0,
				permissions: ["audit_event:read"],
			}),
		},
	});
	const client = new QueryClient();
	const own = ["organisation", "c-1", "access-roles"];
	const overview = ["organisation", "c-1", "recent-activity"];
	const otherCompany = ["organisation", "c-2", "access-roles"];
	for (const key of [own, overview, otherCompany]) client.setQueryData(key, []);
	const wrapper = ({
		children,
	}: {
		children: ReactNode;
	}): FunctionComponent => (
		<QueryClientProvider client={client}>{children}</QueryClientProvider>
	);
	const { result } = renderHook(() => useCreateAccessRole("c-1"), { wrapper });

	await act(async () => {
		await result.current.mutateAsync({
			kind: "COMPANY",
			name: "Auditor",
			permissions: ["audit_event:read"],
		});
	});

	expect(client.getQueryState(own)?.isInvalidated).toBe(true);
	expect(client.getQueryState(overview)?.isInvalidated).toBe(true);
	expect(client.getQueryState(otherCompany)?.isInvalidated).toBe(false);
});
