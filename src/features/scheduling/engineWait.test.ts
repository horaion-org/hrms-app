import { describe, expect, it } from "vitest";
import { ENGINE_ANSWER_WAIT_MILLISECONDS } from "@/features/scheduling/engineWait";

/** The API's longest wait for the engine: a quick failure, its retry's backoff, then the full 30 s. */
const API_WORST_CASE_MILLISECONDS = (1 + 2 + 2 + 30) * 1000;

describe("ENGINE_ANSWER_WAIT_MILLISECONDS", () => {
	it("waits longer than the API does with one engine retry, so the API's own answer comes first", () => {
		expect(ENGINE_ANSWER_WAIT_MILLISECONDS).toBe(40_000);
		expect(ENGINE_ANSWER_WAIT_MILLISECONDS).toBeGreaterThan(
			API_WORST_CASE_MILLISECONDS
		);
	});
});
