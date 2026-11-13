import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configureApiClient, resetApiClient } from "@/common/api-client";
import { envelope, stubApi } from "@/common/testing/stubApi";
import {
	leaveOptionsQuery,
	leaveRequestSchema,
	rosteredDaysQuery,
} from "@/features/leave/api";
import {
	LEAVE_DURATION_OPTION_FIXTURES,
	leaveFixture,
	partDayLeaveFixture,
} from "@/features/leave/fixtures";

describe("leaveRequestSchema", () => {
	it("accepts a leave type code the app has never seen", () => {
		const parsed = leaveRequestSchema.parse(
			leaveFixture({ leaveRequestId: "r-1", leaveType: "STUDY_LEAVE" })
		);
		expect(parsed.leaveType).toBe("STUDY_LEAVE");
	});

	it("reads a request from an API older than the leave type catalogue", () => {
		const older: Record<string, unknown> = {
			...leaveFixture({ leaveRequestId: "r-2" }),
		};
		delete older["leaveTypeId"];
		delete older["leaveTypeName"];
		const parsed = leaveRequestSchema.parse(older);
		expect(parsed.leaveTypeId).toBeNull();
		expect(parsed.leaveTypeName).toBeNull();
	});

	it("reads a part-day request's duration, times and minutes", () => {
		expect(leaveRequestSchema.parse(partDayLeaveFixture())).toMatchObject({
			durationName: "Morning",
			startTime: "09:00",
			endTime: "13:00",
			leaveMinutes: 240,
		});
	});

	it("reads a request from an API older than part days as whole days", () => {
		const older: Record<string, unknown> = {
			...leaveFixture({ leaveRequestId: "r-3" }),
		};
		delete older["durationName"];
		delete older["startTime"];
		delete older["endTime"];
		delete older["leaveMinutes"];
		expect(leaveRequestSchema.parse(older)).toMatchObject({
			durationName: null,
			startTime: null,
			endTime: null,
			leaveMinutes: null,
		});
	});
});

describe("leave lifecycle paths", () => {
	it("given_noMember_when_rosteredDaysAreAsked_then_keyedOnTheCaller", () => {
		expect(
			rosteredDaysQuery("c1", { start: "2026-06-01", end: "2026-06-02" })
				.queryKey
		).toEqual([
			"leave",
			"c1",
			"rostered-days",
			"me",
			"2026-06-01",
			"2026-06-02",
		]);
	});
});

describe("leaveOptionsQuery", () => {
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

	const annual = {
		leaveTypeId: "lt-annual",
		code: "ANNUAL",
		name: "Annual leave",
		grantKind: "ALLOWANCE",
		paid: true,
		requiresReason: false,
		status: "ACTIVE",
		displayOrder: 1,
		system: false,
	};

	it("reads the caller's own options, an older answer allowing part days", async () => {
		stubApi({
			"GET /api/v1/companies/c1/me/leave-requests/leave-options": {
				status: 200,
				body: envelope({ leaveTypes: [annual] }),
			},
		});
		const query = leaveOptionsQuery("c1");
		expect(query.queryKey).toEqual(["leave", "c1", "leave-options", "me"]);
		const options = await (
			query.queryFn as (context: { signal?: AbortSignal }) => Promise<unknown>
		)({});
		expect(options).toEqual({
			leaveTypes: [{ ...annual, allowsPartDays: true }],
			durations: [],
		});
	});

	it("reads a member's options on their path, keyed on them", async () => {
		stubApi({
			"GET /api/v1/companies/c1/member-profiles/m-1/leave-requests/leave-options":
				{
					status: 200,
					body: envelope({
						leaveTypes: [{ ...annual, allowsPartDays: false }],
						durations: LEAVE_DURATION_OPTION_FIXTURES,
					}),
				},
		});
		const query = leaveOptionsQuery("c1", "m-1");
		expect(query.queryKey).toEqual(["leave", "c1", "leave-options", "m-1"]);
		const options = await (
			query.queryFn as (context: { signal?: AbortSignal }) => Promise<unknown>
		)({});
		expect(options).toMatchObject({
			leaveTypes: [{ code: "ANNUAL", allowsPartDays: false }],
			durations: LEAVE_DURATION_OPTION_FIXTURES,
		});
	});
});
