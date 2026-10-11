import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useCurrentCompanyId } from "@/features/organisation/useCurrentCompanyId";
import { workspaceQuery } from "@/features/workspace/api";
import type { PermissionKey } from "@/features/workspace/permissionKeys";
import { retry } from "@/features/workspace/retry";
import {
	accessIndexOf,
	canAll,
	canAny,
	canAnywhere,
	canAt,
	type AccessIndex,
	type AccessTarget,
	type ScopeRef,
} from "@/features/workspace/scopes";

/** What the person may be shown in the current company, from the workspace. */
export type Access = {
	/**
	 * `pending` until the workspace first loads, `error` when it could not be
	 * loaded and nothing is cached. Once loaded it stays `ready` through
	 * reloads, which keep the last answer, so gated controls do not flicker.
	 */
	status: "pending" | "error" | "ready";
	/** Whether the key is effective at exactly this target; an unknown unit is no. */
	can: (permission: PermissionKey, target: ScopeRef) => boolean;
	/** Whether the key is held at any node of the company, e.g. to offer a Module. */
	canAnywhere: (permission: PermissionKey) => boolean;
	/** Whether at least one key holds at the target: alternatives. */
	canAny: (
		permissions: ReadonlyArray<PermissionKey>,
		target: AccessTarget
	) => boolean;
	/** Whether every key holds at the target: prerequisites. */
	canAll: (
		permissions: ReadonlyArray<PermissionKey>,
		target: AccessTarget
	) => boolean;
	/** The index itself, for helpers that take one. */
	index: AccessIndex;
};

/**
 * The one way pages, dialogs and `<Can>` ask what to show. Every answer is
 * no until the workspace has loaded, and no when it failed: administrative
 * controls fail closed, while self-service never asks here.
 *
 * It decides what is shown, never what is allowed: the API checks every
 * request, so a screen must still handle a refusal on anything it offered.
 * The functions keep their identity while the workspace is unchanged, so
 * column definitions and other memoised values that close over them are
 * not rebuilt on every render.
 */
export const useAccess = (): Access => {
	const companyId = useCurrentCompanyId();
	const { data, isError } = useQuery({ ...workspaceQuery, retry });
	const index = accessIndexOf(data, companyId);
	const status = data ? "ready" : isError ? "error" : "pending";
	return useMemo(
		() => ({
			status,
			can: (permission, target) => canAt(index, permission, target),
			canAnywhere: (permission) => canAnywhere(index, permission),
			canAny: (permissions, target) => canAny(index, permissions, target),
			canAll: (permissions, target) => canAll(index, permissions, target),
			index,
		}),
		[index, status]
	);
};
