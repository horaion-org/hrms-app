import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configureApiClient, resetApiClient } from "@/common/api-client";
import { envelope, stubApi } from "@/common/testing/stubApi";
import {
	coverOptionsKey,
	fetchCoverOptions,
} from "@/features/scheduling/cover/api";
import {
	coverOptionFixture,
	coverOptionsFixture,
} from "@/features/scheduling/cover/fixtures";
import { scheduleKey } from "@/features/scheduling/schedules/api";

const UNIT = { branchId: "b-1", departmentId: "d-1" };
const COVER_OPTIONS =
	"/api/v1/companies/c-1/branches/b-1/departments/d-1/schedules/s-1/cover-options";
const GAP = { shiftId: "front-desk-am-copy", day: "2026-10-17" };

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

describe("cover options client", () => {
	it("posts the gap and the revision, and reads the whole answer", async () => {
		const calls = stubApi({
			[`POST ${COVER_OPTIONS}`]: {
				status: 200,
				body: envelope(coverOptionsFixture()),
			},
		});

		const parsed = await fetchCoverOptions("c-1", UNIT, "s-1", {
			...GAP,
			expectedRevision: 1,
		});

		expect(calls[0]?.body).toEqual({ ...GAP, expectedRevision: 1 });
		expect(parsed).toEqual(coverOptionsFixture());
	});

	it("reads a kind, reason or warning it doesn't know as UNKNOWN, and keeps a cell to the change's own fields", async () => {
		const option = coverOptionFixture({
			kind: "SOMETHING_NEW" as never,
			warnings: ["SOMETHING_NEW" as never],
		});
		stubApi({
			[`POST ${COVER_OPTIONS}`]: {
				status: 200,
				body: envelope(
					coverOptionsFixture({
						options: [
							{
								...option,
								cells: [{ ...option.cells[0]!, dayType: null } as never],
							},
						],
						unavailable: [
							{ membershipId: "m-1", reason: "SOMETHING_NEW" as never },
						],
					})
				),
			},
		});

		const parsed = await fetchCoverOptions("c-1", UNIT, "s-1", {
			...GAP,
			expectedRevision: 1,
		});

		expect(parsed.options[0]?.kind).toBe("UNKNOWN");
		expect(parsed.options[0]?.warnings).toEqual(["UNKNOWN"]);
		expect(parsed.unavailable[0]?.reason).toBe("UNKNOWN");
		expect(parsed.options[0]?.cells[0]).toEqual(option.cells[0]);
	});

	it("keys each gap's list at its revision below the schedule's own key", () => {
		expect(coverOptionsKey("c-1", "s-1", GAP, 3)).toEqual([
			...scheduleKey("c-1", "s-1"),
			"coverOptions",
			GAP.shiftId,
			GAP.day,
			3,
		]);
	});
});
