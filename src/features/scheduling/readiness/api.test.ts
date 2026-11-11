import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configureApiClient, resetApiClient } from "@/common/api-client";
import { UnexpectedResponseError } from "@/common/problem";
import { envelope, stubApi } from "@/common/testing/stubApi";
import {
	fetchSchedulingReadiness,
	schedulingReadinessQuery,
} from "@/features/scheduling/readiness/api";
import { readinessFixture } from "@/features/scheduling/readiness/fixtures";

const READINESS = "/api/v1/companies/c-1/scheduling-readiness";
const NOT_READY = readinessFixture({
	departmentId: "d-2",
	departmentName: "Bar",
	ready: false,
	missing: ["SHIFT", "STAFFING_CONSTRAINT"],
});

beforeEach(() => {
	configureApiClient({
		accessToken: () => Promise.resolve("test-pass"),
		renew: () => Promise.resolve({ kind: "expired" }),
		onUnauthenticated: () => {},
	});
});
afterEach(() => {
	resetApiClient();
	vi.unstubAllGlobals();
});

describe("scheduling readiness client", () => {
	it("names the branch and the department only when they are set", async () => {
		const calls = stubApi({
			[`GET ${READINESS}`]: { status: 200, body: envelope([]) },
		});

		await fetchSchedulingReadiness("c-1", {});
		await fetchSchedulingReadiness("c-1", { branchId: "b-1" });
		await fetchSchedulingReadiness("c-1", { departmentId: "d-1" });
		await fetchSchedulingReadiness("c-1", {
			branchId: "b-1",
			departmentId: "d-1",
		});
		expect(calls.map((call) => call.search)).toEqual([
			"",
			"branchId=b-1",
			"departmentId=d-1",
			"branchId=b-1&departmentId=d-1",
		]);
	});

	it("parses each department's readiness and what it lacks", async () => {
		stubApi({
			[`GET ${READINESS}`]: {
				status: 200,
				body: envelope([readinessFixture(), NOT_READY]),
			},
		});

		await expect(fetchSchedulingReadiness("c-1", {})).resolves.toEqual([
			readinessFixture(),
			NOT_READY,
		]);
	});

	it("rejects a gap it does not know", async () => {
		stubApi({
			[`GET ${READINESS}`]: {
				status: 200,
				body: envelope([{ ...NOT_READY, missing: ["ROLE"] }]),
			},
		});

		await expect(fetchSchedulingReadiness("c-1", {})).rejects.toBeInstanceOf(
			UnexpectedResponseError
		);
	});

	it("asks for nothing without the permission", () => {
		expect(typeof schedulingReadinessQuery("c-1", {}).queryFn).toBe("function");
		expect(typeof schedulingReadinessQuery("c-1", {}, false).queryFn).not.toBe(
			"function"
		);
	});

	it("keys readiness per unit selection, under the company", () => {
		expect(
			schedulingReadinessQuery("c-1", { departmentId: "d-1" }).queryKey
		).toEqual(["scheduling", "c-1", "readiness", { departmentId: "d-1" }]);
	});
});
