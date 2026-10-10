import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configureApiClient, resetApiClient } from "@/common/api-client";
import { UnexpectedResponseError } from "@/common/problem";
import { envelope, stubApi } from "@/common/testing/stubApi";
import {
	createShift,
	deleteShift,
	fetchShifts,
	setShiftInclusion,
	updateShift,
	type ShiftBody,
} from "@/features/scheduling/shifts/api";
import {
	SHIFT_FIXTURES,
	scheduleShiftsFixture,
} from "@/features/scheduling/shifts/fixtures";

const UNIT = { branchId: "b-1", departmentId: "d-1" };
const SHIFTS =
	"/api/v1/companies/c-1/branches/b-1/departments/d-1/schedules/s-1/shifts";

const BODY: ShiftBody = {
	name: "Front Desk AM",
	group: "Front Desk",
	colour: "#E9A55A",
	startTime: "09:00",
	endTime: "15:00",
	days: ["MON", "TUE"],
	jobTitleIds: ["front-desk-staff"],
};

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

describe("shifts client", () => {
	it("lists a schedule's shifts and parses them", async () => {
		const shifts = scheduleShiftsFixture();
		const calls = stubApi({
			[`GET ${SHIFTS}`]: { status: 200, body: envelope(shifts) },
		});

		await expect(fetchShifts("c-1", UNIT, "s-1")).resolves.toEqual(shifts);
		expect(calls.map((call) => `${call.method} ${call.path}`)).toEqual([
			`GET ${SHIFTS}`,
		]);
	});

	it("sets which shifts the schedule includes and parses every shift back", async () => {
		const shifts = SHIFT_FIXTURES.map((shift) => ({
			...shift,
			included: shift.shiftId === "lunch-rush",
		}));
		const calls = stubApi({
			[`PUT ${SHIFTS}/inclusion`]: { status: 200, body: envelope(shifts) },
		});

		await expect(
			setShiftInclusion("c-1", UNIT, "s-1", ["lunch-rush"])
		).resolves.toEqual(shifts);
		expect(calls[0]?.body).toEqual({ includedShiftIds: ["lunch-rush"] });
	});

	it("posts a shift to its schedule and parses the answer", async () => {
		const calls = stubApi({
			[`POST ${SHIFTS}`]: { status: 201, body: envelope(SHIFT_FIXTURES[0]) },
		});

		await expect(createShift("c-1", UNIT, "s-1", BODY)).resolves.toEqual(
			SHIFT_FIXTURES[0]
		);
		expect(calls[0]?.body).toEqual(BODY);
	});

	it.each([
		["day", { days: ["FUNDAY"] }],
		["group", { group: 7 }],
		["colour", { colour: "orange" }],
		["inclusion", { included: "yes" }],
	])(
		"rejects a shift with an unknown %s instead of trusting its type",
		async (_field, overrides) => {
			stubApi({
				[`POST ${SHIFTS}`]: {
					status: 201,
					body: envelope({ ...SHIFT_FIXTURES[0], ...overrides }),
				},
			});

			await expect(
				createShift("c-1", UNIT, "s-1", BODY)
			).rejects.toBeInstanceOf(UnexpectedResponseError);
		}
	);

	it("replaces and deletes a shift of its schedule", async () => {
		const calls = stubApi({
			[`PUT ${SHIFTS}/front-desk-am`]: {
				status: 200,
				body: envelope(SHIFT_FIXTURES[0]),
			},
			[`DELETE ${SHIFTS}/front-desk-am`]: { status: 204 },
		});

		await expect(
			updateShift("c-1", UNIT, "s-1", "front-desk-am", BODY)
		).resolves.toEqual(SHIFT_FIXTURES[0]);
		await expect(
			deleteShift("c-1", UNIT, "s-1", "front-desk-am")
		).resolves.toBeUndefined();
		expect(calls.map((call) => `${call.method} ${call.path}`)).toEqual([
			`PUT ${SHIFTS}/front-desk-am`,
			`DELETE ${SHIFTS}/front-desk-am`,
		]);
		expect(calls[0]?.body).toEqual(BODY);
	});
});
