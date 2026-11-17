import { ApiProblemError, isDecisionEngineStale } from "@/common/problem";

/** Retries of a read that failed for a reason that may pass next time, other than a stale decision engine. */
const RETRIES = 3;
/** The first wait before such a retry; each further wait doubles, up to `LONGEST_RETRY_DELAY_MS`. */
const FIRST_RETRY_DELAY_MS = 1_000;
const LONGEST_RETRY_DELAY_MS = 30_000;

/**
 * A read refused while the API's decision engine catches up with a recent
 * organisation change is asked again every `STALE_RETRY_DELAY_MS`, at most
 * `STALE_RETRIES` times: 20 s in all, after which the screen says what is
 * happening and offers Try again.
 */
export const STALE_RETRY_DELAY_MS = 2_000;
export const STALE_RETRIES = 10;

/**
 * Retries what may pass next time: an outage, a server error (1 s, 2 s,
 * 4 s), or a `503 DECISION_ENGINE_STALE` (every 2 s for 20 s). A refusal or
 * a bad request won't pass next time, so it isn't retried. Only reads use
 * it: a write is never repeated without the person asking.
 */
export const retry = (failureCount: number, error: Error): boolean => {
	if (isDecisionEngineStale(error)) return failureCount < STALE_RETRIES;
	return (
		failureCount < RETRIES &&
		!(error instanceof ApiProblemError && error.status < 500)
	);
};

/** The wait before retry number `failureCount` (from 0), as `retry` describes. */
export const retryDelay = (failureCount: number, error: Error): number =>
	isDecisionEngineStale(error)
		? STALE_RETRY_DELAY_MS
		: Math.min(FIRST_RETRY_DELAY_MS * 2 ** failureCount, LONGEST_RETRY_DELAY_MS);
