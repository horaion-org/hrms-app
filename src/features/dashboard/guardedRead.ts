import type { UseQueryResult } from "@tanstack/react-query";
import { ApiProblemError } from "@/common/problem";
import type { Access } from "@/features/workspace/useAccess";

/**
 * What a guarded dashboard read shows: `hidden` when the person's grants
 * don't reach it, whether the workspace says so up front or the API refuses
 * with a 403.
 */
export type GuardedRead<T> =
	{ status: "pending" | "error" | "hidden" } | { status: "ready"; data: T };

/** One read's answer as a card shows it, following `useLeaveRequests`. */
export const guardedRead = <T>(
	access: Pick<Access, "status">,
	allowed: boolean,
	query: Pick<UseQueryResult<T>, "data" | "error" | "isError">
): GuardedRead<T> => {
	if (access.status !== "ready") return { status: access.status };
	if (!allowed) return { status: "hidden" };
	if (query.error instanceof ApiProblemError && query.error.status === 403)
		return { status: "hidden" };
	if (query.isError) return { status: "error" };
	if (query.data === undefined) return { status: "pending" };
	return { status: "ready", data: query.data };
};
