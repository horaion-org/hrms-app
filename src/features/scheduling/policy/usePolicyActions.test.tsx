import { act, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { configureApiClient, resetApiClient } from "@/common/api-client";
import type { FunctionComponent } from "@/common/types";
import { envelope, stubApi } from "@/common/testing/stubApi";
import { constraintsKey } from "@/features/scheduling/constraints/api";
import { COMPANY_CONSTRAINT_FIXTURES } from "@/features/scheduling/constraints/fixtures";
import {
	policyKey,
	type PolicyConstraintBody,
} from "@/features/scheduling/policy/api";
import {
	usePolicyActions,
	type PolicyActions,
} from "@/features/scheduling/policy/usePolicyActions";

const POLICY = "/api/v1/companies/c-1/scheduling-policy/constraints";
const REST = COMPANY_CONSTRAINT_FIXTURES[0]!;
const BODY: PolicyConstraintBody = {
	name: "Company rest",
	type: "REST_BETWEEN_SHIFTS",
	requirement: null,
	status: "ACTIVE",
	lock: "LOCKED",
	values: [{ field: "REST_HOURS", value: "12" }],
};

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

it.each([
	[
		"adding",
		`POST ${POLICY}`,
		(actions: PolicyActions): Promise<unknown> =>
			actions.createConstraint.mutateAsync(BODY),
	],
	[
		"changing",
		`PUT ${POLICY}/company-rest`,
		(actions: PolicyActions): Promise<unknown> =>
			actions.updateConstraint.mutateAsync({
				constraintId: "company-rest",
				body: BODY,
			}),
	],
	[
		"removing",
		`DELETE ${POLICY}/company-rest`,
		(actions: PolicyActions): Promise<unknown> =>
			actions.deleteConstraint.mutateAsync("company-rest"),
	],
])(
	"%s a policy constraint reloads the policy and every department's constraints, this company's only",
	async (_verb, route, perform) => {
		stubApi({
			[route]: route.startsWith("DELETE")
				? { status: 204 }
				: { status: 200, body: envelope(REST) },
		});
		const client = new QueryClient();
		const policy = policyKey("c-1", "constraints");
		const department = constraintsKey("c-1", "d-1");
		const otherCompany = constraintsKey("c-2", "d-9");
		for (const key of [policy, department, otherCompany])
			client.setQueryData(key, []);
		const wrapper = ({
			children,
		}: {
			children: ReactNode;
		}): FunctionComponent => (
			<QueryClientProvider client={client}>{children}</QueryClientProvider>
		);
		const { result, unmount } = renderHook(() => usePolicyActions("c-1"), {
			wrapper,
		});

		await act(async () => {
			await perform(result.current);
		});

		expect(client.getQueryState(policy)?.isInvalidated).toBe(true);
		expect(client.getQueryState(department)?.isInvalidated).toBe(true);
		expect(client.getQueryState(otherCompany)?.isInvalidated).toBe(false);
		unmount();
		client.clear();
	}
);
