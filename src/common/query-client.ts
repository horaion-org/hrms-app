import {
	QueryClient,
	type UndefinedInitialDataOptions,
} from "@tanstack/react-query";
import { retry, retryDelay } from "@/common/queryRetry";

/**
 * Shared with the router; ending the Session clears this cache. Every read
 * retries by the app's one rule (`@/common/queryRetry`); writes keep
 * TanStack's default of no retry.
 */
export const queryClient = new QueryClient({
	defaultOptions: { queries: { retry, retryDelay } },
});

/**
 * What a `…Query(…)` options factory returns: the data as the query
 * function resolves it (no `select`), failures as `Error`, under `Key`.
 */
export type QueryOptionsFor<
	Data,
	Key extends ReadonlyArray<unknown>,
> = UndefinedInitialDataOptions<Data, Error, Data, Key>;
