import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configureApiClient, resetApiClient } from "@/common/api-client";
import { envelope, stubApi } from "@/common/testing/stubApi";
import {
	fetchRepairOptions,
	repairOptionsKey,
} from "@/features/scheduling/cover/engineRepairApi";
import {
	callInMove,
	feasibleRepair,
	repairOptionsFixture,
} from "@/features/scheduling/cover/engineRepairFixtures";
import { scheduleKey } from "@/features/scheduling/schedules/api";

const TARGET = {
	companyId: "c-1",
	unit: { branchId: "b-1", departmentId: "d-1" },
	scheduleId: "s-1",
	runId: "r-1",
};
const REPAIR_OPTIONS =
	"/api/v1/companies/c-1/branches/b-1/departments/d-1/schedules/s-1/repair-options";
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

describe("engine repair options client", () => {
	it("posts the gap and the revision, and reads each option", async () => {
		const calls = stubApi({
			[`POST ${REPAIR_OPTIONS}`]: {
				status: 200,
				body: envelope(repairOptionsFixture()),
			},
		});

		const parsed = await fetchRepairOptions(TARGET, {
			...GAP,
			expectedRevision: 1,
		});

		expect(calls[0]?.body).toEqual({ ...GAP, expectedRevision: 1 });
		expect(parsed.options).toEqual([feasibleRepair()]);
	});

	it("reads a move kind a newer API adds as one the app can't describe", async () => {
		stubApi({
			[`POST ${REPAIR_OPTIONS}`]: {
				status: 200,
				body: envelope(
					repairOptionsFixture([
						feasibleRepair([{ ...callInMove(), kind: "SWAP" as never }]),
					])
				),
			},
		});

		const parsed = await fetchRepairOptions(TARGET, {
			...GAP,
			expectedRevision: 1,
		});

		expect(parsed.options[0]?.moves[0]?.kind).toBe("UNKNOWN");
	});

	it("keys one gap's options at one revision below the schedule", () => {
		expect(repairOptionsKey("c-1", "s-1", GAP, 2)).toEqual([
			...scheduleKey("c-1", "s-1"),
			"repairOptions",
			GAP.shiftId,
			GAP.day,
			2,
		]);
	});
});
