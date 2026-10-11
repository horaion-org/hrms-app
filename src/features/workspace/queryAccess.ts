import type { Query, QueryClient } from "@tanstack/react-query";
import type { Workspace } from "@/features/workspace/api";
import { effectivePermissionMap } from "@/features/workspace/scopes";

/**
 * What a query reads, declared on every query's `meta` so access changes
 * can find the right ones without guessing from key prefixes:
 *
 * - `administrative`: records reached through the caller's grants (lists,
 *   other people's profiles, roles). Withdrawn when the caller's access in
 *   `companyId` shrinks.
 * - `self`: the caller's own records and context (My profile, My leave, the
 *   workspace itself). Never gated by, or withdrawn for, administrative
 *   grants.
 */
export type QueryAccessMeta = {
	accessKind: "administrative" | "self";
	/** The company the records belong to; absent for cross-company reads such as the workspace. */
	companyId?: string;
	/**
	 * A single record read. A 404 from it can mean the record moved out of
	 * reach, so it triggers an advisory workspace refresh; a list's 404 does not.
	 */
	record?: boolean;
};

declare module "@tanstack/react-query" {
	interface Register {
		queryMeta: QueryAccessMeta;
	}
}

/** `meta` for a query that reads through the caller's grants in `companyId`. */
export const administrativeMeta = (
	companyId: string,
	{ record = false }: { record?: boolean } = {}
): QueryAccessMeta => ({
	accessKind: "administrative",
	companyId,
	...(record && { record }),
});

/** `meta` for a query that reads the caller's own records or context. */
export const selfMeta = (companyId?: string): QueryAccessMeta => ({
	accessKind: "self",
	...(companyId !== undefined && { companyId }),
});

/** Queries withdrawn after an access change; their data must never be shown again, even as a placeholder. */
const withdrawn = new WeakSet<object>();

type Placeholder = <T>(
	previous: T | undefined,
	previousQuery: object | undefined
) => T | undefined;

const makePlaceholder = (): Placeholder => (previous, previousQuery) =>
	previousQuery && withdrawn.has(previousQuery) ? undefined : previous;

let placeholder = makePlaceholder();

/**
 * `keepPreviousData` for administrative lists, minus anything withdrawn:
 * rows of a query withdrawn after an access change are never kept on
 * screen while its replacement loads. The function is replaced on every
 * withdrawal so TanStack does not reuse a placeholder it memoised before.
 * Read it at render time, never once at module load.
 */
export const accessiblePreviousData = (): Placeholder => placeholder;

const isAdministrative =
	(companyId: string) =>
	(query: Query): boolean =>
		query.meta?.accessKind === "administrative" &&
		query.meta.companyId === companyId;

/**
 * Withdraws the company's administrative queries: each is reset, which
 * aborts its request in flight and tells its observers to drop the data,
 * then removed from the cache, so an old response can never repopulate it
 * and the next render builds a fresh query from the current grants.
 */
export const withdrawAdministrativeQueries = (
	queryClient: QueryClient,
	companyId: string
): void => {
	const predicate = isAdministrative(companyId);
	const queries = queryClient.getQueryCache().findAll({ predicate });
	if (queries.length === 0) return;
	for (const query of queries) withdrawn.add(query);
	placeholder = makePlaceholder();
	for (const query of queries) query.reset();
	queryClient.removeQueries({ predicate });
};

type PermissionMap = ReturnType<typeof effectivePermissionMap>;

/**
 * The companies where some node lost a key, or disappeared, between two
 * workspace answers. A grant that only grew needs nothing withdrawn: the
 * views asking for it re-render with the new workspace.
 */
export const companiesWithShrunkAccess = (
	before: PermissionMap,
	after: PermissionMap
): Array<string> =>
	[...before].flatMap(([companyId, targets]) => {
		const now = after.get(companyId);
		const shrank = [...targets].some(([target, permissions]) => {
			const current = now?.get(target);
			return (
				permissions.size > 0 &&
				[...permissions].some((permission) => !current?.has(permission))
			);
		});
		return shrank ? [companyId] : [];
	});

const WORKSPACE_KEY = "workspace";

/**
 * Watches every workspace answer and withdraws a company's administrative
 * queries when the caller's effective permissions there shrank, so rows
 * fetched under the old grants are neither shown nor kept. Returns a
 * function that stops watching.
 */
export const watchAccessChanges = (queryClient: QueryClient): (() => void) => {
	const current = (): PermissionMap | undefined => {
		const data = queryClient.getQueryData<Workspace>([WORKSPACE_KEY]);
		return data ? effectivePermissionMap(data) : undefined;
	};
	let previous = current();
	return queryClient.getQueryCache().subscribe((event) => {
		const queryKey = event.query.queryKey as ReadonlyArray<unknown>;
		if (queryKey[0] !== WORKSPACE_KEY) return;
		if (event.type === "removed") {
			previous = undefined;
			return;
		}
		if (event.type !== "updated" || event.action.type !== "success") return;
		const next = current();
		if (!next) return;
		const before = previous;
		previous = next;
		if (!before) return;
		for (const companyId of companiesWithShrunkAccess(before, next))
			withdrawAdministrativeQueries(queryClient, companyId);
	});
};
