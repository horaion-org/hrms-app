import { ApiProblemError } from "@/common/problem";

/** Retries what may pass next time (outages); a refusal or a bad request won't. */
export const retry = (failureCount: number, error: Error): boolean =>
	failureCount < 2 && !(error instanceof ApiProblemError && error.status < 500);
