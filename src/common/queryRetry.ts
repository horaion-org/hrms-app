import { ApiProblemError, isDecisionEngineStale } from "@/common/problem";

/** Retries of a read that failed for a reason that may pass next time, other than a stale decision engine. */
const RETRIES = 3;
/** The first wait before such a retry; each further wait doubles, up to `LONGEST_RETRY_DELAY_MS`. */
const FIRST_RETRY_DELAY_MS = 1_000;
const LONGEST_RETRY_DELAY_MS = 30_000;
const MILLISECONDS_PER_SECOND = 1_000;

/**
 * A read refused while the API's access rules catch up with a recent
 * organisation change (`503 DECISION_ENGINE_STALE`, usually under 5 s) is
 * asked again `STALE_RETRIES` times, each after the API's `Retry-After`
 * (5 s today), or after `STALE_FALLBACK_DELAY_MS` from an API that sends
 * none. Then the screen says what is happening and offers Try again.
 */
export const STALE_RETRIES = 2;
export const STALE_FALLBACK_DELAY_MS = 2_000;

/**
 * Retries what may pass next time: an outage, a server error (1 s, 2 s,
 * 4 s), or a `503 DECISION_ENGINE_STALE` (twice, after the API's
 * `Retry-After`). A refusal or a bad request won't pass next time, so it
 * isn't retried. Only reads use it: a write is never repeated without the
 * person asking.
 */
export const retry = (failureCount: number, error: Error): boolean => {
	if (isDecisionEngineStale(error)) return failureCount < STALE_RETRIES;
	return (
		failureCount < RETRIES &&
		!(error instanceof ApiProblemError && error.status < 500)
	);
};

/** The wait before retry number `failureCount` (from 0), as `retry` describes. */
export const retryDelay = (failureCount: number, error: Error): number => {
	if (isDecisionEngineStale(error))
		return error instanceof ApiProblemError &&
			error.retryAfterSeconds !== undefined
			? error.retryAfterSeconds * MILLISECONDS_PER_SECOND
			: STALE_FALLBACK_DELAY_MS;
	return Math.min(
		FIRST_RETRY_DELAY_MS * 2 ** failureCount,
		LONGEST_RETRY_DELAY_MS
	);
};
