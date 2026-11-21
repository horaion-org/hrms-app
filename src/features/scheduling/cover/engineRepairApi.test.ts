import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configureApiClient, resetApiClient } from "@/common/api-client";
import { envelope, stubApi } from "@/common/testing/stubApi";
import { ENGINE_ANSWER_WAIT_MILLISECONDS } from "@/features/scheduling/engineWait";
import {
	fetchRepairOptions,
	repairOptionsKey,
} from "@/features/scheduling/cover/engineRepairApi";
import {
	callInMove,
	callInOption,
	daySwapOption,
	feasibleRepair,
	moveOption,
	NOT_ASSIGNED_FIXTURE,
	oneOfTwoOption,
	otherTwoPeopleOption,
	repairOptionsFixture,
	restDayCallInOption,
	stretchAfterOption,
	stretchMove,
	stretchPairOption,
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
	it("waits for the engine as long as the API does, past the default", async () => {
		const timeout = vi.spyOn(AbortSignal, "timeout");
		stubApi({ [`POST ${REPAIR_OPTIONS}`]: { status: 503 } });

		await fetchRepairOptions(TARGET, { ...GAP, expectedRevision: 3 }).catch(
			() => undefined
		);

		expect(timeout).toHaveBeenCalledWith(ENGINE_ANSWER_WAIT_MILLISECONDS);
		timeout.mockRestore();
	});

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

	it("reads why others were not assigned, an empty list as empty, and an answer without it as not known", async () => {
		/** What the client reads `notAssigned` as for one answer. */
		const notAssignedOf = async (answer: unknown): Promise<unknown> => {
			stubApi({
				[`POST ${REPAIR_OPTIONS}`]: { status: 200, body: envelope(answer) },
			});
			const parsed = await fetchRepairOptions(TARGET, {
				...GAP,
				expectedRevision: 1,
			});
			return parsed.notAssigned;
		};

		expect(
			await notAssignedOf(repairOptionsFixture([], NOT_ASSIGNED_FIXTURE))
		).toEqual(NOT_ASSIGNED_FIXTURE);
		expect(await notAssignedOf(repairOptionsFixture([], []))).toEqual([]);
		const { notAssigned: _left, ...withoutNotAssigned } = repairOptionsFixture(
			[]
		);
		expect(await notAssignedOf(withoutNotAssigned)).toBeNull();
	});

	it("reads a reason code the app has never seen as it is", async () => {
		stubApi({
			[`POST ${REPAIR_OPTIONS}`]: {
				status: 200,
				body: envelope(
					repairOptionsFixture(
						[],
						[
							{
								memberProfileId: "m-7",
								name: "Gita Rao",
								couldTake: false,
								reasons: [
									{
										code: "on_training",
										rule: null,
										constraintId: null,
										constraintName: null,
									},
								],
							},
						]
					)
				),
			},
		});

		const parsed = await fetchRepairOptions(TARGET, {
			...GAP,
			expectedRevision: 1,
		});

		expect(parsed.notAssigned?.[0]?.reasons[0]?.code).toBe("on_training");
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

	it("reads the answer's revision, search and what is short now, and each option's kind, fill, cost, cells and people", async () => {
		const options = [
			callInOption(),
			restDayCallInOption(),
			moveOption(),
			stretchAfterOption(),
			stretchPairOption(),
			daySwapOption(),
			otherTwoPeopleOption(),
			oneOfTwoOption(),
		];
		stubApi({
			[`POST ${REPAIR_OPTIONS}`]: {
				status: 200,
				body: envelope(
					repairOptionsFixture(options, null, {
						revision: 4,
						search: { complete: false, optionsFound: 12 },
					})
				),
			},
		});

		const parsed = await fetchRepairOptions(TARGET, {
			...GAP,
			expectedRevision: 4,
		});

		expect(parsed.revision).toBe(4);
		expect(parsed.search).toEqual({ complete: false, optionsFound: 12 });
		expect(parsed.shortNow).toEqual([
			{ start: "2026-10-17T09:00:00", end: "2026-10-17T15:00:00", shortBy: 1 },
		]);
		expect(parsed.options).toEqual(options);
	});

	it("reads an option kind or fill this app does not know as OTHER and as not said", async () => {
		stubApi({
			[`POST ${REPAIR_OPTIONS}`]: {
				status: 200,
				body: envelope(
					repairOptionsFixture([
						{
							...callInOption(),
							kind: "SPLIT_SHIFT" as never,
							fills: "HALF" as never,
						},
					])
				),
			},
		});

		const parsed = await fetchRepairOptions(TARGET, {
			...GAP,
			expectedRevision: 1,
		});

		expect(parsed.options[0]?.kind).toBe("OTHER");
		expect(parsed.options[0]?.fills).toBeNull();
	});

	it("reads a cell's nulls as left out, so it goes back as the app's own cells do", async () => {
		stubApi({
			[`POST ${REPAIR_OPTIONS}`]: {
				status: 200,
				body: envelope(
					repairOptionsFixture([
						{
							...daySwapOption(),
							cells: [
								{
									membershipId: "m-1",
									day: "2026-10-17",
									kind: "WORK",
									shiftId: "front-desk-am-copy",
									dayType: null,
									stretchBeforeMinutes: null,
									stretchAfterMinutes: null,
								},
								{
									membershipId: "m-1",
									day: "2026-10-16",
									kind: "OFF",
									shiftId: null,
									dayType: "OFF",
									stretchBeforeMinutes: null,
									stretchAfterMinutes: null,
								},
							] as never,
						},
					])
				),
			},
		});

		const parsed = await fetchRepairOptions(TARGET, {
			...GAP,
			expectedRevision: 1,
		});

		expect(JSON.parse(JSON.stringify(parsed.options[0]?.cells))).toEqual([
			{
				membershipId: "m-1",
				day: "2026-10-17",
				kind: "WORK",
				shiftId: "front-desk-am-copy",
			},
			{ membershipId: "m-1", day: "2026-10-16", kind: "OFF", dayType: "OFF" },
		]);
	});

	it("reads a stretch move's side, and a side it does not know as none", async () => {
		stubApi({
			[`POST ${REPAIR_OPTIONS}`]: {
				status: 200,
				body: envelope(
					repairOptionsFixture([
						feasibleRepair([stretchMove()]),
						feasibleRepair([stretchMove({ side: "SIDEWAYS" as never })]),
						feasibleRepair([callInMove()]),
					])
				),
			},
		});

		const parsed = await fetchRepairOptions(TARGET, {
			...GAP,
			expectedRevision: 1,
		});

		expect(parsed.options[0]?.moves[0]?.side).toBe("AFTER_SHIFT");
		expect(parsed.options[1]?.moves[0]?.side).toBeNull();
		expect(parsed.options[2]?.moves[0]?.side).toBeUndefined();
	});
});
