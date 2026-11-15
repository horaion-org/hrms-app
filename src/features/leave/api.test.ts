import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configureApiClient, resetApiClient } from "@/common/api-client";
import { envelope, stubApi } from "@/common/testing/stubApi";
import {
	type LeaveDurationOption,
	type LeaveOptions,
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

	it("reads a part-day request's duration, times, minutes and shift choice", () => {
		expect(leaveRequestSchema.parse(partDayLeaveFixture())).toMatchObject({
			durationName: "Morning",
			startTime: "09:00",
			endTime: "13:00",
			leaveMinutes: 240,
			allowsShiftSameDay: true,
		});
		expect(
			leaveRequestSchema.parse(
				partDayLeaveFixture({ allowsShiftSameDay: false })
			).allowsShiftSameDay
		).toBe(false);
	});

	it("reads a part-day request from an API older than the shift choice as not saying", () => {
		const older: Record<string, unknown> = { ...partDayLeaveFixture() };
		delete older["allowsShiftSameDay"];
		expect(leaveRequestSchema.parse(older).allowsShiftSameDay).toBeNull();
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
			"",
			"",
			null,
		]);
	});

	it("given_aPartDayLeaveWindow_when_rosteredDaysAreAsked_then_theTimesGoInTheQueryAndTheOutcomeIsRead", async () => {
		configureApiClient({
			accessToken: () => Promise.resolve("test-pass"),
			renew: () => Promise.resolve({ kind: "expired" }),
			onUnauthenticated: () => {},
		});
		const calls = stubApi({
			"GET /api/v1/companies/c1/me/leave-requests/rostered-days": {
				status: 200,
				body: envelope([
					{
						day: "2026-06-01",
						minutes: 480,
						shiftStart: "07:00",
						shiftEnd: "15:00",
						outcome: "SHORTENED",
						workedTimes: [{ start: "11:00", end: "15:00" }],
						gap: { start: "07:00", end: "11:00" },
					},
					{ day: "2026-06-02", minutes: 480, outcome: "SPLIT_LATER" },
				]),
			},
		});
		const query = rosteredDaysQuery("c1", {
			start: "2026-06-01",
			end: "2026-06-02",
			startTime: "07:00",
			endTime: "11:00",
		});

		const days = await (
			query.queryFn as (context: { signal?: AbortSignal }) => Promise<unknown>
		)({});

		expect(new URLSearchParams(calls[0]?.search)).toEqual(
			new URLSearchParams({
				startDate: "2026-06-01",
				endDate: "2026-06-02",
				startTime: "07:00",
				endTime: "11:00",
			})
		);
		expect(days).toMatchObject([
			{ outcome: "SHORTENED", gap: { start: "07:00", end: "11:00" } },
			{ outcome: "UNKNOWN" },
		]);
		resetApiClient();
		vi.unstubAllGlobals();
	});

	it("given_aPartDayLeaveWithNoShiftThatDay_when_rosteredDaysAreAsked_then_theChoiceGoesWithTheTimes", async () => {
		configureApiClient({
			accessToken: () => Promise.resolve("test-pass"),
			renew: () => Promise.resolve({ kind: "expired" }),
			onUnauthenticated: () => {},
		});
		const calls = stubApi({
			"GET /api/v1/companies/c1/me/leave-requests/rostered-days": {
				status: 200,
				body: envelope([]),
			},
		});
		const period = {
			start: "2026-06-01",
			end: "2026-06-01",
			startTime: "07:00",
			endTime: "11:00",
			allowsShiftSameDay: false,
		};
		const query = rosteredDaysQuery("c1", period);

		await (
			query.queryFn as (context: { signal?: AbortSignal }) => Promise<unknown>
		)({});

		expect(query.queryKey).toEqual([
			"leave",
			"c1",
			"rostered-days",
			"me",
			"2026-06-01",
			"2026-06-01",
			"07:00",
			"11:00",
			false,
		]);
		expect(new URLSearchParams(calls[0]?.search)).toEqual(
			new URLSearchParams({
				startDate: "2026-06-01",
				endDate: "2026-06-01",
				startTime: "07:00",
				endTime: "11:00",
				allowsShiftSameDay: "false",
			})
		);
		resetApiClient();
		vi.unstubAllGlobals();
	});

	it("given_theShiftChoiceWithoutTimes_when_rosteredDaysAreAsked_then_itIsNotSent", async () => {
		configureApiClient({
			accessToken: () => Promise.resolve("test-pass"),
			renew: () => Promise.resolve({ kind: "expired" }),
			onUnauthenticated: () => {},
		});
		const calls = stubApi({
			"GET /api/v1/companies/c1/me/leave-requests/rostered-days": {
				status: 200,
				body: envelope([]),
			},
		});
		const query = rosteredDaysQuery("c1", {
			start: "2026-06-01",
			end: "2026-06-01",
			allowsShiftSameDay: false,
		});

		await (
			query.queryFn as (context: { signal?: AbortSignal }) => Promise<unknown>
		)({});

		expect(new URLSearchParams(calls[0]?.search)).toEqual(
			new URLSearchParams({ startDate: "2026-06-01", endDate: "2026-06-01" })
		);
		resetApiClient();
		vi.unstubAllGlobals();
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

	it("reads a duration's shift choice, and an older answer without it as a shift still possible", async () => {
		const [morning, night] = LEAVE_DURATION_OPTION_FIXTURES as [
			LeaveDurationOption,
			LeaveDurationOption,
		];
		const older: Record<string, unknown> = { ...night };
		delete older["allowsShiftSameDay"];
		stubApi({
			"GET /api/v1/companies/c1/me/leave-requests/leave-options": {
				status: 200,
				body: envelope({
					leaveTypes: [annual],
					durations: [{ ...morning, allowsShiftSameDay: false }, older],
				}),
			},
		});
		const options = await (
			leaveOptionsQuery("c1").queryFn as (context: {
				signal?: AbortSignal;
			}) => Promise<LeaveOptions>
		)({});
		expect(
			options.durations.map((duration) => duration.allowsShiftSameDay)
		).toEqual([false, true]);
	});
});
