import { act, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { configureApiClient, resetApiClient } from "@/common/api-client";
import type { FunctionComponent } from "@/common/types";
import { envelope, problemReply, stubApi } from "@/common/testing/stubApi";
import { activeLeaveTypesQuery } from "@/features/leave/api";
import {
	leaveTypeCatalogueQuery,
	type LeaveTypeOrderBody,
} from "@/features/leaveTypes/api";
import { LEAVE_TYPE_CATALOGUE_FIXTURE } from "@/features/leaveTypes/fixtures";
import { useLeaveTypeActions } from "@/features/leaveTypes/useLeaveTypeActions";

const LEAVE_TYPES = "/api/v1/companies/c-1/leave-types";
const ORDER: LeaveTypeOrderBody = {
	grantKind: "ALLOWANCE",
	leaveTypeIds: ["lt-sick", "lt-annual"],
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

const setUp = (): {
	client: QueryClient;
	invalidated: (key: ReadonlyArray<unknown>) => boolean | undefined;
	actions: () => ReturnType<typeof useLeaveTypeActions>;
} => {
	const client = new QueryClient({
		defaultOptions: { mutations: { retry: false } },
	});
	client.setQueryData(activeLeaveTypesQuery("c-1").queryKey, []);
	client.setQueryData(leaveTypeCatalogueQuery("c-1").queryKey, []);
	client.setQueryData(["leave", "c-1", "me", {}], []);
	client.setQueryData(activeLeaveTypesQuery("c-2").queryKey, []);
	const wrapper = ({
		children,
	}: {
		children: ReactNode;
	}): FunctionComponent => (
		<QueryClientProvider client={client}>{children}</QueryClientProvider>
	);
	const { result } = renderHook(() => useLeaveTypeActions("c-1"), { wrapper });
	return {
		client,
		invalidated: (key) => client.getQueryState(key)?.isInvalidated,
		actions: () => result.current,
	};
};

it("reloads the apply form's catalogue and the leave lists after a write, this company's only", async () => {
	stubApi({
		[`PUT ${LEAVE_TYPES}/lt-annual`]: {
			status: 200,
			body: envelope(LEAVE_TYPE_CATALOGUE_FIXTURE[0]),
		},
	});
	const { invalidated, actions } = setUp();

	await act(() =>
		actions().updateLeaveType.mutateAsync({
			leaveTypeId: "lt-annual",
			body: {
				name: "Holiday",
				grantKind: "ALLOWANCE",
				paid: true,
				requiresReason: false,
				allowsPartDays: true,
				appliesToBranchIds: [],
				appliesToDepartmentIds: [],
				status: "ACTIVE",
			},
		})
	);

	expect(invalidated(activeLeaveTypesQuery("c-1").queryKey)).toBe(true);
	expect(invalidated(["leave", "c-1", "me", {}])).toBe(true);
	expect(invalidated(activeLeaveTypesQuery("c-2").queryKey)).toBe(false);
});

it("shows a new order at once and reloads after a refused one, so the next try starts fresh", async () => {
	stubApi({
		[`PUT ${LEAVE_TYPES}/order`]: [
			{ status: 200, body: envelope(LEAVE_TYPE_CATALOGUE_FIXTURE) },
			problemReply(400, "INVALID_LEAVE_TYPE_ORDER"),
		],
	});
	const { client, invalidated, actions } = setUp();

	await act(() => actions().reorderLeaveTypes.mutateAsync(ORDER));
	expect(client.getQueryData(leaveTypeCatalogueQuery("c-1").queryKey)).toEqual(
		LEAVE_TYPE_CATALOGUE_FIXTURE
	);

	client.setQueryData(leaveTypeCatalogueQuery("c-1").queryKey, []);
	await act(async () => {
		await actions()
			.reorderLeaveTypes.mutateAsync(ORDER)
			.catch(() => undefined);
	});
	expect(invalidated(leaveTypeCatalogueQuery("c-1").queryKey)).toBe(true);
});
