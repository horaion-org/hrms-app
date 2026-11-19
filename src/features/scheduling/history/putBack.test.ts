import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configureApiClient, resetApiClient } from "@/common/api-client";
import { ApiProblemError } from "@/common/problem";
import { envelope, stubApi } from "@/common/testing/stubApi";
import { authTestI18n } from "@/features/auth/testingI18n";
import {
	mayPutBack,
	putBackSchedule,
} from "@/features/scheduling/history/putBack";
import {
	dayRunsText,
	putBackBlockFrom,
	putBackBlockOf,
	putBackRefusal,
	type RosterInTheWay,
} from "@/features/scheduling/history/putBackRefusal";
import {
	deletedScheduleFixture,
	generatedScheduleFixture,
} from "@/features/scheduling/schedules/fixtures";

const t = authTestI18n.t.bind(authTestI18n);

/** A run of days without the thin spaces some runtimes put around its dash, so one sentence fits them all. */
const tight = (text: string): string => text.replace(/\s?–\s?/g, "–");

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

/** The roster put back in these cases: Wednesday to Friday of the week of 12 October 2026. */
const OWN = { from: "2026-10-14", to: "2026-10-16" };

/** A roster in the way; to review and on the roster's own days unless said otherwise. */
const inTheWay = (
	coveredFrom: string,
	coveredTo: string,
	overrides: Partial<RosterInTheWay> = {}
): RosterInTheWay => ({
	scheduleId: `s-${coveredFrom}`,
	coveredFrom,
	coveredTo,
	replaceable: true,
	laterInTheWeek: false,
	...overrides,
});

/** A refusal as the API client raises it, with the problem body it carried. */
const refusal = (
	status: number,
	errorCode: string | undefined,
	rosters?: Array<RosterInTheWay>
): ApiProblemError =>
	new ApiProblemError({
		message: "API prose that is never shown",
		status,
		errorCode,
		fieldErrors: [],
		reason: "http",
		body: rosters && { errorCode, details: { inTheWay: rosters } },
	});

describe("mayPutBack", () => {
	it.each([
		["MANAGER", "GENERATED", true, true],
		["MANAGER", "REJECTED", true, true],
		// Without schedule:delete at its Department it is only read.
		["MANAGER", "GENERATED", false, false],
		// A later run replaced it, so that run's roster is on its days.
		["REPLACED", "GENERATED", true, false],
		// No cause recorded: it can't be told apart from a replaced one.
		[null, "GENERATED", true, false],
		// No roster to put back.
		["MANAGER", "GENERATION_FAILED", true, false],
		["MANAGER", "DRAFT", true, false],
		["MANAGER", "UNKNOWN", true, false],
	] as const)(
		"given cause %s, status %s and the delete key %s, offers it: %s",
		(cause, status, holdsKey, offered) => {
			const schedule = deletedScheduleFixture({
				status,
				deletion: {
					deletedAt: "2026-10-15T03:00:00Z",
					deletedByName: "Lina Tan",
					cause,
				},
			});
			const asked: Array<unknown> = [];
			const access = {
				can: (...question: Array<unknown>): boolean => {
					asked.push(question);
					return holdsKey;
				},
			};

			expect(mayPutBack(schedule, access)).toBe(offered);
			// The key is asked for at the schedule's own Department, never company-wide.
			for (const question of asked)
				expect(JSON.stringify(question)).toContain("schedule:delete");
		}
	);
});

describe("putBackBlockOf", () => {
	it.each([
		[
			"a roster to review inside its days: warns, and no day is left empty",
			"wouldReplace",
			[inTheWay("2026-10-15", "2026-10-16")],
			{
				kind: "replace",
				days: [{ from: "2026-10-15", to: "2026-10-16" }],
				extraDays: [],
			},
		],
		[
			"one that also covers earlier days: those days would have no roster",
			"wouldReplace",
			[inTheWay("2026-10-12", "2026-10-15")],
			{
				kind: "replace",
				days: [{ from: "2026-10-12", to: "2026-10-15" }],
				extraDays: [{ from: "2026-10-12", to: "2026-10-13" }],
			},
		],
		[
			"one that covers its whole week: the days before and after are left empty",
			"wouldReplace",
			[inTheWay("2026-10-12", "2026-10-18")],
			{
				kind: "replace",
				days: [{ from: "2026-10-12", to: "2026-10-18" }],
				extraDays: [
					{ from: "2026-10-12", to: "2026-10-13" },
					{ from: "2026-10-17", to: "2026-10-18" },
				],
			},
		],
		[
			"two rosters in the way, given out of order: both named in day order",
			"wouldReplace",
			[
				inTheWay("2026-10-16", "2026-10-18"),
				inTheWay("2026-10-14", "2026-10-15"),
			],
			{
				kind: "replace",
				days: [
					{ from: "2026-10-14", to: "2026-10-15" },
					{ from: "2026-10-16", to: "2026-10-18" },
				],
				extraDays: [{ from: "2026-10-17", to: "2026-10-18" }],
			},
		],
		[
			"a would-replace refusal with no list: warns about its own days",
			"wouldReplace",
			[],
			{ kind: "replace", days: [OWN], extraDays: [] },
		],
		[
			"a published or generating roster on its days: refused, naming them",
			"daysTaken",
			[inTheWay("2026-10-14", "2026-10-14", { replaceable: false })],
			{ kind: "daysTaken", days: [{ from: "2026-10-14", to: "2026-10-14" }] },
		],
		[
			"a fixed roster beside one to review: only the fixed one is named",
			"daysTaken",
			[
				inTheWay("2026-10-15", "2026-10-16"),
				inTheWay("2026-10-14", "2026-10-14", { replaceable: false }),
			],
			{ kind: "daysTaken", days: [{ from: "2026-10-14", to: "2026-10-14" }] },
		],
		[
			"a roster only later in the week: refused as worked out without it",
			"daysTaken",
			[inTheWay("2026-10-17", "2026-10-18", { laterInTheWeek: true })],
			{ kind: "laterDays", days: [{ from: "2026-10-17", to: "2026-10-18" }] },
		],
		[
			"a fixed roster on its days and one later: the fixed one goes first",
			"daysTaken",
			[
				inTheWay("2026-10-17", "2026-10-18", { laterInTheWeek: true }),
				inTheWay("2026-10-14", "2026-10-15", { replaceable: false }),
			],
			{ kind: "daysTaken", days: [{ from: "2026-10-14", to: "2026-10-15" }] },
		],
		[
			"a later roster that can't be replaced: still the later-days case",
			"daysTaken",
			[
				inTheWay("2026-10-17", "2026-10-18", {
					replaceable: false,
					laterInTheWeek: true,
				}),
			],
			{ kind: "laterDays", days: [{ from: "2026-10-17", to: "2026-10-18" }] },
		],
		[
			"a days-taken refusal with no list: no days named",
			"daysTaken",
			[],
			{ kind: "unnamed" },
		],
	] as const)("given %s", (_, kind, rosters, expected) => {
		expect(putBackBlockOf(kind, rosters, OWN)).toEqual(expected);
	});
});

describe("putBackBlockFrom", () => {
	it("reads the rosters in the way from the refusal's details", () => {
		const error = refusal(409, "SCHEDULE_PUT_BACK_WOULD_REPLACE", [
			inTheWay("2026-10-12", "2026-10-15"),
		]);

		expect(putBackBlockFrom(error, OWN)).toEqual({
			kind: "replace",
			days: [{ from: "2026-10-12", to: "2026-10-15" }],
			extraDays: [{ from: "2026-10-12", to: "2026-10-13" }],
		});
	});

	it("ignores a list it can't read rather than guess at it", () => {
		const unreadable = new ApiProblemError({
			message: "",
			status: 409,
			errorCode: "SCHEDULE_PUT_BACK_DAYS_TAKEN",
			fieldErrors: [],
			reason: "http",
			body: { details: { inTheWay: [{ scheduleId: "s-9" }] } },
		});

		expect(putBackBlockFrom(unreadable, OWN)).toEqual({ kind: "unnamed" });
	});

	it.each([
		["a refusal for another reason", refusal(409, "SCHEDULE_NOT_RESTORABLE")],
		["not found", refusal(404, "SCHEDULE_NOT_FOUND")],
		["something that is not a refusal", new Error("offline")],
	])("says nothing stands in the way for %s", (_, error) => {
		expect(putBackBlockFrom(error, OWN)).toBeUndefined();
	});
});

describe("putBackRefusal", () => {
	it.each([
		[
			"a published or generating roster on its days",
			refusal(409, "SCHEDULE_PUT_BACK_DAYS_TAKEN", [
				inTheWay("2026-10-14", "2026-10-15", { replaceable: false }),
			]),
			"This roster can’t be put back: 14–15 Oct 2026 hold a published roster or one being generated. Withdraw the published roster or wait for the generation to end, then put it back.",
		],
		[
			"a roster later in the same week",
			refusal(409, "SCHEDULE_PUT_BACK_DAYS_TAKEN", [
				inTheWay("2026-10-17", "2026-10-18", { laterInTheWeek: true }),
			]),
			"This roster can’t be put back: 17–18 Oct 2026, later in the same week, were worked out without it. Delete that roster first, or keep it and generate these days again.",
		],
		[
			"days taken with no list",
			refusal(409, "SCHEDULE_PUT_BACK_DAYS_TAKEN"),
			"This roster can’t be put back: its days hold a published roster or one being generated, or later days in the same week were worked out without it. Withdraw the published roster or wait for the generation to end, then put it back.",
		],
		[
			"a roster a run replaced",
			refusal(409, "SCHEDULE_NOT_RESTORABLE"),
			"This roster can’t be put back: a newer roster replaced it. Generate its days again from the Generate page instead.",
		],
		[
			"one no longer in History",
			refusal(404, "SCHEDULE_NOT_FOUND"),
			"This roster is no longer in History. Reload the page.",
		],
		[
			"no permission",
			refusal(403, undefined),
			"You don’t have permission to put back rosters at this department.",
		],
		[
			"anything else",
			new Error("offline"),
			"We couldn’t put the roster back. Try again.",
		],
	])("words %s", (_, error, sentence) => {
		expect(tight(putBackRefusal(error, OWN, t, "en-GB"))).toBe(sentence);
	});

	it("never shows the API's own prose", () => {
		const error = refusal(409, "SCHEDULE_PUT_BACK_DAYS_TAKEN");

		expect(putBackRefusal(error, OWN, t, "en-GB")).not.toContain("API prose");
	});
});

describe("dayRunsText", () => {
	it("joins runs of days with and", () => {
		expect(
			tight(
				dayRunsText(
					[
						{ from: "2026-10-12", to: "2026-10-13" },
						{ from: "2026-10-17", to: "2026-10-17" },
					],
					"en-GB"
				)
			)
		).toBe("12–13 Oct 2026 and 17 Oct 2026");
	});
});

describe("putBackSchedule", () => {
	const RESTORATION =
		"POST /api/v1/companies/c-1/branches/b-1/departments/d-1/schedules/s-1/restoration";
	const UNIT = { branchId: "b-1", departmentId: "d-1" };
	const answer = {
		status: 200,
		body: envelope(generatedScheduleFixture({ status: "GENERATED" })),
	};

	it("asks without a body first, so nothing is replaced unasked", async () => {
		const calls = stubApi({ [RESTORATION]: answer });

		const schedule = await putBackSchedule("c-1", UNIT, "s-1");

		expect(schedule.status).toBe("GENERATED");
		expect(calls).toHaveLength(1);
		expect(calls[0]?.body).toBeUndefined();
	});

	it("sends the flag only when told the rosters in the way may be replaced", async () => {
		const calls = stubApi({ [RESTORATION]: answer });

		await putBackSchedule("c-1", UNIT, "s-1", true);

		expect(calls[0]?.body).toEqual({ replaceRostersInTheWay: true });
	});
});

describe("a refused put-back as the API builds it", () => {
	const RESTORATION =
		"POST /api/v1/companies/c-1/branches/b-1/departments/d-1/schedules/s-1/restoration";
	const UNIT = { branchId: "b-1", departmentId: "d-1" };
	/** The week the API's example roster in the way covers. */
	const WEEK = { from: "2026-11-23", to: "2026-11-29" };

	/** The problem body exactly as the API sends it: RFC 7807, with its extra fields at the top level. */
	const problem = (errorCode: string, inTheWay: Array<unknown>): unknown => ({
		type: "about:blank",
		title: "Conflict",
		status: 409,
		detail:
			"Schedule '0b0f5c1e-6a57-4d0c-9a51-2f4f3c1d7e10' cannot be put back without replacing the roster to review on its days. Confirm that the roster to review may be deleted, then put this one back.",
		instance:
			"/api/v1/companies/c-1/branches/b-1/departments/d-1/schedules/0b0f5c1e-6a57-4d0c-9a51-2f4f3c1d7e10/restoration",
		errorCode,
		details: { inTheWay },
	});

	/** The error the API client raises for a refused put-back answered with `body`. */
	const refusedWith = async (body: unknown): Promise<unknown> => {
		stubApi({ [RESTORATION]: { status: 409, body } });
		return putBackSchedule("c-1", UNIT, "s-1").catch((error: unknown) => error);
	};

	it("reads a would-replace refusal's code and its top-level details through the API client", async () => {
		const error = await refusedWith(
			problem("SCHEDULE_PUT_BACK_WOULD_REPLACE", [
				{
					scheduleId: "7c9e6679-7425-40de-944b-e07fc1f90ae7",
					coveredFrom: "2026-11-23",
					coveredTo: "2026-11-29",
					replaceable: true,
					laterInTheWeek: false,
				},
			])
		);

		expect(error).toBeInstanceOf(ApiProblemError);
		expect(putBackBlockFrom(error, WEEK)).toEqual({
			kind: "replace",
			days: [WEEK],
			extraDays: [],
		});
	});

	it("names the blocking days of a days-taken refusal", async () => {
		const error = await refusedWith(
			problem("SCHEDULE_PUT_BACK_DAYS_TAKEN", [
				{
					scheduleId: "7c9e6679-7425-40de-944b-e07fc1f90ae7",
					coveredFrom: "2026-11-23",
					coveredTo: "2026-11-25",
					replaceable: false,
					laterInTheWeek: false,
				},
				{
					scheduleId: "9b2d3c4e-1f6a-4b7c-8d9e-0a1b2c3d4e5f",
					coveredFrom: "2026-11-28",
					coveredTo: "2026-11-29",
					replaceable: false,
					laterInTheWeek: true,
				},
			])
		);

		expect(
			putBackBlockFrom(error, { from: "2026-11-23", to: "2026-11-27" })
		).toEqual({
			kind: "daysTaken",
			days: [{ from: "2026-11-23", to: "2026-11-25" }],
		});
	});

	it("names no days when the list is empty, as when the database refused the days", async () => {
		const error = await refusedWith(
			problem("SCHEDULE_PUT_BACK_DAYS_TAKEN", [])
		);

		expect(putBackBlockFrom(error, WEEK)).toEqual({ kind: "unnamed" });
		expect(putBackRefusal(error, WEEK, t, "en-GB")).toBe(
			"This roster can’t be put back: its days hold a published roster or one being generated, or later days in the same week were worked out without it. Withdraw the published roster or wait for the generation to end, then put it back."
		);
	});
});
