import { QueryClient } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiProblemError } from "@/common/problem";
import { workspaceQuery } from "@/features/workspace/api";
import {
	administrativeMeta,
	type QueryAccessMeta,
} from "@/features/workspace/queryAccess";
import { refreshWorkspaceOnRefusal } from "@/features/workspace/refreshWorkspaceOnRefusal";

const refusal = (status: number, errorCode: string): ApiProblemError =>
	new ApiProblemError({
		message: "Refused",
		status,
		errorCode,
		fieldErrors: [],
		reason: "http",
	});

let stop: (() => void) | undefined;
afterEach(() => {
	stop?.();
	stop = undefined;
});

const listen = (): QueryClient => {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
	});
	stop = refreshWorkspaceOnRefusal(queryClient);
	return queryClient;
};

const failQuery = async (
	queryClient: QueryClient,
	queryKey: ReadonlyArray<string>,
	error: Error,
	meta?: QueryAccessMeta
): Promise<void> => {
	await queryClient
		.fetchQuery({ queryKey, queryFn: () => Promise.reject(error), meta })
		.catch(() => undefined);
};

describe("refreshWorkspaceOnRefusal", () => {
	it("reloads the workspace when a query is refused with a 403", async () => {
		const queryClient = listen();
		const invalidate = vi.spyOn(queryClient, "invalidateQueries");
		await failQuery(queryClient, ["branches"], refusal(403, "ACCESS_DENIED"));
		expect(invalidate).toHaveBeenCalledWith({
			queryKey: workspaceQuery.queryKey,
		});
	});

	it("reloads the workspace when a mutation is refused with a 403", async () => {
		const queryClient = listen();
		const invalidate = vi.spyOn(queryClient, "invalidateQueries");
		await queryClient
			.getMutationCache()
			.build(queryClient, {
				mutationFn: () => Promise.reject(refusal(403, "ACCESS_DENIED")),
			})
			.execute(undefined)
			.catch(() => undefined);
		expect(invalidate).toHaveBeenCalledTimes(1);
	});

	it("leaves other failures, revoked memberships and the workspace's own refusal alone", async () => {
		const queryClient = listen();
		const invalidate = vi.spyOn(queryClient, "invalidateQueries");
		await failQuery(queryClient, ["branches"], refusal(404, "NOT_FOUND"));
		await failQuery(queryClient, ["branches"], new Error("offline"));
		await failQuery(
			queryClient,
			["branches"],
			refusal(403, "MEMBERSHIP_REVOKED")
		);
		await failQuery(
			queryClient,
			[...workspaceQuery.queryKey],
			refusal(403, "ACCESS_DENIED")
		);
		expect(invalidate).not.toHaveBeenCalled();
	});

	it("leaves a business-rule refusal alone: reloading roles cannot change it", async () => {
		const queryClient = listen();
		const invalidate = vi.spyOn(queryClient, "invalidateQueries");
		await queryClient
			.getMutationCache()
			.build(queryClient, {
				mutationFn: () =>
					Promise.reject(refusal(403, "OWN_LEAVE_REVIEW_DENIED")),
			})
			.execute(undefined)
			.catch(() => undefined);
		expect(invalidate).not.toHaveBeenCalled();
	});

	it("reloads the workspace when one administrative record answers 404, as it may have moved out of reach", async () => {
		const queryClient = listen();
		const invalidate = vi.spyOn(queryClient, "invalidateQueries");
		await failQuery(
			queryClient,
			["people", "c-1", "profile", "m-1"],
			refusal(404, "MEMBER_PROFILE_NOT_FOUND"),
			administrativeMeta("c-1", { record: true })
		);
		expect(invalidate).toHaveBeenCalledWith({
			queryKey: workspaceQuery.queryKey,
		});
	});

	it("leaves a list's 404 alone, so not every 404 reloads the workspace", async () => {
		const queryClient = listen();
		const invalidate = vi.spyOn(queryClient, "invalidateQueries");
		await failQuery(
			queryClient,
			["people", "c-1", "list"],
			refusal(404, "NOT_FOUND"),
			administrativeMeta("c-1")
		);
		expect(invalidate).not.toHaveBeenCalled();
	});

	it("stops listening once stopped", async () => {
		const queryClient = listen();
		const invalidate = vi.spyOn(queryClient, "invalidateQueries");
		stop?.();
		await failQuery(queryClient, ["branches"], refusal(403, "ACCESS_DENIED"));
		expect(invalidate).not.toHaveBeenCalled();
	});
});
