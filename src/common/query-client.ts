import {
	QueryClient,
	type UndefinedInitialDataOptions,
} from "@tanstack/react-query";

/** Shared with the router; ending the Session clears this cache. */
export const queryClient = new QueryClient();

/**
 * What a `…Query(…)` options factory returns: the data as the query
 * function resolves it (no `select`), failures as `Error`, under `Key`.
 */
export type QueryOptionsFor<
	Data,
	Key extends ReadonlyArray<unknown>,
> = UndefinedInitialDataOptions<Data, Error, Data, Key>;
