import { ApiProblemError } from "@/common/problem";

/**
 * Three retries on the default backoff (1 s, 2 s, 4 s) cover 7 s: longer than
 * the API's worst-case stale window, which lasts until OPA's next bundle poll
 * (up to 5 s) after a grant change.
 */
const RETRIES = 3;

/**
 * Retries what may pass next time: an outage, or a `503` while the API waits
 * for the decision engine to pick up a grant change. A refusal or a bad request
 * won't pass next time, so it isn't retried.
 */
export const retry = (failureCount: number, error: Error): boolean =>
	failureCount < RETRIES &&
	!(error instanceof ApiProblemError && error.status < 500);
