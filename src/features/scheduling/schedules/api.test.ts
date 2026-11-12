import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configureApiClient, resetApiClient } from "@/common/api-client";
import { ApiProblemError } from "@/common/problem";
import { envelope, stubApi } from "@/common/testing/stubApi";
import { authTestI18n } from "@/features/auth/testingI18n";
import {
	createSchedule,
	deleteSchedule,
	fetchCompanySchedule,
	fetchSchedule,
	fetchScheduleAssignments,
	fetchSchedules,
	fetchScheduleConstraints,
	fetchScheduleShifts,
	decidable,
	deletable,
	generationInProgress,
	hasRoster,
	regenerable,
	withdrawable,
	publishSchedule,
	rejectSchedule,
	rosterEditable,
	rosterRunId,
	scheduleAssignmentsKey,
	scheduleAssignmentsQuery,
	updateSchedule,
	type ScheduleAssignment,
	type ScheduleBody,
} from "@/features/scheduling/schedules/api";
import {
	generatedScheduleFixture,
	generationFindingsFixture,
	generationFixture,
	scheduleAssignmentsFixture,
	scheduleFixture,
} from "@/features/scheduling/schedules/fixtures";
import {
	CONSTRAINT_FIXTURES,
	frozenConstraintsFixture,
} from "@/features/scheduling/constraints/fixtures";
import {
	decisionRefusal,
	deleteRefusal,
	monthGenerationRefusal,
	refusalOfCode,
	withdrawalRefusal,
	scheduleRefusal,
	scheduleRefusalMessage,
} from "@/features/scheduling/schedules/scheduleRefusal";
import {
	frozenShiftsFixture,
	scheduleShiftsFixture,
} from "@/features/scheduling/shifts/fixtures";

const UNIT = { branchId: "b-1", departmentId: "d-1" };
const SCHEDULES =
	"/api/v1/companies/c-1/branches/b-1/departments/d-1/schedules";

const BODY: ScheduleBody = {
	name: "Front Office - Week 42",
	periodStart: "2026-10-12",
	includeLeave: true,
	allowOpenShifts: false,
	includedShiftIds: ["front-desk-am"],
	includedConstraintIds: ["morning-cover"],
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

describe("schedules client", () => {
	it("reads all company schedule pages, including drafts and generation requests", async () => {
		const draft = scheduleFixture();
		const generated = generatedScheduleFixture({ scheduleId: "s-2" });
		const calls = stubApi({
			"GET /api/v1/companies/c-1/schedules": [
				{
					status: 200,
					body: envelope({ content: [draft], page: { hasNext: true } }),
				},
				{
					status: 200,
					body: envelope({ content: [generated], page: { hasNext: false } }),
				},
			],
		});
		await expect(fetchSchedules("c-1", {})).resolves.toEqual([
			draft,
			generated,
		]);
		expect(
			calls.map((call) => new URLSearchParams(call.search).get("page"))
		).toEqual(["0", "1"]);
	});

	it("sends the chosen Branch and Department, and neither for every one in scope", async () => {
		const calls = stubApi({
			"GET /api/v1/companies/c-1/schedules": [
				{
					status: 200,
					body: envelope({ content: [], page: { hasNext: false } }),
				},
				{
					status: 200,
					body: envelope({ content: [], page: { hasNext: false } }),
				},
			],
		});

		await fetchSchedules("c-1", { branchId: "b-1", departmentId: "d-1" });
		await fetchSchedules("c-1", {});

		const sent = calls.map((call) => new URLSearchParams(call.search));
		expect(sent.map((search) => search.get("branchId"))).toEqual(["b-1", null]);
		expect(sent.map((search) => search.get("departmentId"))).toEqual([
			"d-1",
			null,
		]);
	});

	it("does not return partial history when a later page fails", async () => {
		stubApi({
			"GET /api/v1/companies/c-1/schedules": [
				{
					status: 200,
					body: envelope({
						content: [scheduleFixture()],
						page: { hasNext: true },
					}),
				},
				{ status: 500 },
			],
		});
		await expect(fetchSchedules("c-1", {})).rejects.toThrow();
	});

	it("creates a draft for a department and parses it", async () => {
		const schedule = scheduleFixture();
		const calls = stubApi({
			[`POST ${SCHEDULES}`]: { status: 201, body: envelope(schedule) },
		});

		await expect(createSchedule("c-1", UNIT, BODY)).resolves.toEqual(schedule);
		expect(calls[0]?.body).toEqual(BODY);
	});

	it("reads and replaces one schedule at its department, ticks included", async () => {
		const schedule = scheduleFixture();
		const calls = stubApi({
			[`GET ${SCHEDULES}/s-1`]: { status: 200, body: envelope(schedule) },
			[`PUT ${SCHEDULES}/s-1`]: { status: 200, body: envelope(schedule) },
		});
		const body = { ...BODY, name: "Front Office - Late Week" };

		await expect(fetchSchedule("c-1", UNIT, "s-1")).resolves.toEqual(schedule);
		await expect(updateSchedule("c-1", UNIT, "s-1", body)).resolves.toEqual(
			schedule
		);
		expect(calls.map((call) => `${call.method} ${call.path}`)).toEqual([
			`GET ${SCHEDULES}/s-1`,
			`PUT ${SCHEDULES}/s-1`,
		]);
		expect(calls[1]?.body).toEqual(body);
	});

	it("parses a generated schedule with who asked for it", async () => {
		const schedule = generatedScheduleFixture();
		stubApi({
			[`GET ${SCHEDULES}/s-1`]: { status: 200, body: envelope(schedule) },
		});

		await expect(fetchSchedule("c-1", UNIT, "s-1")).resolves.toEqual(schedule);
	});

	it("reads one schedule by its id alone at the company", async () => {
		const schedule = generatedScheduleFixture();
		const calls = stubApi({
			"GET /api/v1/companies/c-1/schedules/s-1": {
				status: 200,
				body: envelope(schedule),
			},
		});

		await expect(fetchCompanySchedule("c-1", "s-1")).resolves.toEqual(schedule);
		expect(calls.map((call) => `${call.method} ${call.path}`)).toEqual([
			"GET /api/v1/companies/c-1/schedules/s-1",
		]);
	});

	it("reads schedules whose generation ended, each keeping its status", async () => {
		const generated = generatedScheduleFixture({ status: "GENERATED" });
		const failed = generatedScheduleFixture({
			scheduleId: "s-2",
			status: "GENERATION_FAILED",
		});
		stubApi({
			"GET /api/v1/companies/c-1/schedules": {
				status: 200,
				body: envelope({
					content: [generated, failed],
					page: { hasNext: false },
				}),
			},
		});

		const schedules = await fetchSchedules("c-1", {});
		expect(schedules).toEqual([generated, failed]);
		expect(schedules.map((schedule) => schedule.status)).toEqual([
			"GENERATED",
			"GENERATION_FAILED",
		]);
	});

	it("reads a schedule and run status this build does not know as UNKNOWN instead of failing the read", async () => {
		const generated = generatedScheduleFixture({ status: "GENERATED" });
		stubApi({
			[`GET ${SCHEDULES}/s-1`]: {
				status: 200,
				body: envelope({
					...generated,
					status: "ARCHIVED",
					generation: { ...generated.generation, status: "CANCELLED" },
				}),
			},
		});

		const schedule = await fetchSchedule("c-1", UNIT, "s-1");

		expect(schedule.status).toBe("UNKNOWN");
		expect(schedule.generation?.status).toBe("UNKNOWN");
		// Unknown is neither in progress nor something to generate again.
		expect(generationInProgress(schedule)).toBe(false);
		expect(regenerable(schedule)).toBe(false);
	});

	it("lists a draft's live shifts and a generated schedule's frozen copies", async () => {
		const live = scheduleShiftsFixture();
		const frozen = frozenShiftsFixture();
		stubApi({
			[`GET ${SCHEDULES}/s-1/shifts`]: [
				{ status: 200, body: envelope(live) },
				{ status: 200, body: envelope(frozen) },
			],
		});

		await expect(fetchScheduleShifts("c-1", UNIT, "s-1")).resolves.toEqual(
			live
		);
		const copies = await fetchScheduleShifts("c-1", UNIT, "s-1");
		expect(copies).toEqual(frozen);
		// Each copy has its own id, never a live shift's.
		expect(
			copies.some((copy) =>
				live.some((shift) => shift.shiftId === copy.shiftId)
			)
		).toBe(false);
	});

	it("lists a draft's live active constraints with their ticks and a generated schedule's frozen copies", async () => {
		const live = CONSTRAINT_FIXTURES.filter(
			(constraint) => constraint.status === "ACTIVE"
		).map((constraint) => ({
			constraintId: constraint.constraintId,
			name: constraint.name,
			type: constraint.type,
			category: constraint.category,
			requirement: constraint.requirement,
			values: constraint.values,
			included: constraint.constraintId === "morning-cover",
			frozen: false,
			level: "DEPARTMENT" as const,
			setBy: "Front Office",
			locked: false,
			overridesConstraintId: null,
			replacesCompanyConstraint: false,
		}));
		const frozen = frozenConstraintsFixture();
		stubApi({
			[`GET ${SCHEDULES}/s-1/constraints`]: [
				{ status: 200, body: envelope(live) },
				{ status: 200, body: envelope(frozen) },
			],
		});

		await expect(fetchScheduleConstraints("c-1", UNIT, "s-1")).resolves.toEqual(
			live
		);
		const copies = await fetchScheduleConstraints("c-1", UNIT, "s-1");
		expect(copies).toEqual(frozen);
		// Each copy has its own id, never a live constraint's.
		expect(
			copies.some((copy) =>
				live.some((constraint) => constraint.constraintId === copy.constraintId)
			)
		).toBe(false);
	});

	it("publishes a roster with no body and reads the schedule back", async () => {
		const published = generatedScheduleFixture({ status: "PUBLISHED" });
		const calls = stubApi({
			[`POST ${SCHEDULES}/s-1/approval`]: {
				status: 200,
				body: envelope(published),
			},
		});

		await expect(publishSchedule("c-1", UNIT, "s-1")).resolves.toEqual(
			published
		);
		expect(calls.map((call) => `${call.method} ${call.path}`)).toEqual([
			`POST ${SCHEDULES}/s-1/approval`,
		]);
		expect(calls[0]?.body).toBeUndefined();
	});

	it("rejects a roster with its trimmed reason and reads the schedule back", async () => {
		const rejected = generatedScheduleFixture({ status: "REJECTED" });
		const calls = stubApi({
			[`POST ${SCHEDULES}/s-1/rejection`]: {
				status: 200,
				body: envelope(rejected),
			},
		});

		await expect(
			rejectSchedule("c-1", UNIT, "s-1", "  Nights have no supervisor.\n")
		).resolves.toEqual(rejected);
		expect(calls[0]?.body).toEqual({ reason: "Nights have no supervisor." });
	});

	it("deletes a schedule with no body and reads nothing back", async () => {
		const calls = stubApi({
			[`DELETE ${SCHEDULES}/s-1`]: { status: 204 },
		});

		await expect(deleteSchedule("c-1", UNIT, "s-1")).resolves.toBeUndefined();
		expect(calls.map((call) => `${call.method} ${call.path}`)).toEqual([
			`DELETE ${SCHEDULES}/s-1`,
		]);
	});
});

describe("a schedule's generation", () => {
	it("parses a generated schedule with its time zone, its run and everything the engine found", async () => {
		const schedule = generatedScheduleFixture({ status: "GENERATED" });
		stubApi({
			[`GET ${SCHEDULES}/s-1`]: { status: 200, body: envelope(schedule) },
		});

		const parsed = await fetchSchedule("c-1", UNIT, "s-1");
		expect(parsed).toEqual(schedule);
		expect(parsed.timeZone).toBe("Asia/Singapore");
		expect(parsed.generation?.findings?.members).toHaveLength(3);
	});

	it("reads a run without findings yet, and a draft without a run", async () => {
		const requested = generatedScheduleFixture();
		stubApi({
			[`GET ${SCHEDULES}/s-1`]: [
				{ status: 200, body: envelope(requested) },
				{ status: 200, body: envelope(scheduleFixture()) },
			],
		});

		await expect(fetchSchedule("c-1", UNIT, "s-1")).resolves.toMatchObject({
			generation: { status: "SUBMITTED", findings: null, finishedAt: null },
		});
		await expect(fetchSchedule("c-1", UNIT, "s-1")).resolves.toMatchObject({
			generation: null,
		});
	});

	it("drops keys it doesn't know and reads findings without members as naming none", async () => {
		// Undefined is left out of the JSON the API answers.
		const findings = { ...generationFindingsFixture(), members: undefined };
		const schedule = generatedScheduleFixture({ status: "GENERATED" });
		stubApi({
			[`GET ${SCHEDULES}/s-1`]: {
				status: 200,
				body: envelope({
					...schedule,
					generation: {
						...generationFixture(),
						attempts: 3,
						findings: { ...findings, solverSeconds: 4.2 },
					},
				}),
			},
		});

		const parsed = await fetchSchedule("c-1", UNIT, "s-1");
		expect(parsed.generation).toEqual(
			generationFixture({
				findings: generationFindingsFixture({ members: [] }),
			})
		);
	});

	it("reads a run status it doesn't know as UNKNOWN, which is not an open run", async () => {
		stubApi({
			[`GET ${SCHEDULES}/s-1`]: {
				status: 200,
				body: envelope(
					generatedScheduleFixture({
						status: "GENERATED",
						generation: generationFixture({
							status: "RETRYING" as "SUBMITTED",
						}),
					})
				),
			},
		});

		const schedule = await fetchSchedule("c-1", UNIT, "s-1");

		expect(schedule.generation?.status).toBe("UNKNOWN");
		expect(generationInProgress(schedule)).toBe(false);
	});

	it.each([
		["a draft", scheduleFixture(), false],
		["a requested schedule", generatedScheduleFixture(), true],
		[
			"a generated schedule whose run succeeded",
			generatedScheduleFixture({ status: "GENERATED" }),
			false,
		],
		[
			"a generated schedule with a newer run still open",
			generatedScheduleFixture({
				status: "GENERATED",
				generation: generationFixture({
					status: "PENDING_SUBMIT",
					finishedAt: null,
				}),
			}),
			true,
		],
		[
			"a schedule whose generation failed",
			generatedScheduleFixture({ status: "GENERATION_FAILED" }),
			false,
		],
	])("knows whether %s is still being generated", (_, schedule, expected) => {
		expect(generationInProgress(schedule)).toBe(expected);
	});

	it.each([
		["a draft", scheduleFixture(), false],
		["a requested schedule", generatedScheduleFixture(), false],
		[
			"a generated schedule",
			generatedScheduleFixture({ status: "GENERATED" }),
			true,
		],
		[
			"a generated schedule with a newer run still open",
			generatedScheduleFixture({
				status: "GENERATED",
				generation: generationFixture({
					status: "SUBMITTED",
					finishedAt: null,
				}),
			}),
			false,
		],
		[
			"a schedule whose generation failed",
			generatedScheduleFixture({ status: "GENERATION_FAILED" }),
			true,
		],
		[
			"a rejected schedule",
			generatedScheduleFixture({ status: "REJECTED" }),
			true,
		],
		[
			"a published schedule",
			generatedScheduleFixture({ status: "PUBLISHED" }),
			false,
		],
		[
			"a schedule whose publication was withdrawn",
			generatedScheduleFixture({
				status: "GENERATED",
				publicationWithdrawnAt: "2026-10-13T09:00:00Z",
			}),
			false,
		],
	])("knows whether %s can be generated again", (_, schedule, expected) => {
		expect(regenerable(schedule)).toBe(expected);
	});

	it.each([
		["a draft", scheduleFixture(), undefined],
		["a requested schedule", generatedScheduleFixture(), undefined],
		[
			"a generated schedule",
			generatedScheduleFixture({ status: "GENERATED" }),
			"run-1",
		],
		[
			"a generated schedule with a newer run still open",
			generatedScheduleFixture({
				status: "GENERATED",
				generation: generationFixture({
					runId: "run-2",
					status: "SUBMITTED",
					finishedAt: null,
				}),
			}),
			undefined,
		],
		[
			"a schedule whose generation failed",
			generatedScheduleFixture({ status: "GENERATION_FAILED" }),
			undefined,
		],
		[
			"a published schedule",
			generatedScheduleFixture({ status: "PUBLISHED" }),
			"run-1",
		],
		[
			"a generated schedule with no run on record",
			generatedScheduleFixture({ status: "GENERATED", generation: null }),
			null,
		],
	])("names the run %s shows its roster from", (_, schedule, expected) => {
		expect(rosterRunId(schedule)).toBe(expected);
	});
});

describe("a schedule's decision", () => {
	it("parses who published or rejected a roster, when and why", async () => {
		const rejected = generatedScheduleFixture({ status: "REJECTED" });
		stubApi({
			[`GET ${SCHEDULES}/s-1`]: { status: 200, body: envelope(rejected) },
		});

		const parsed = await fetchSchedule("c-1", UNIT, "s-1");
		expect(parsed.status).toBe("REJECTED");
		expect(parsed.decidedBy).toEqual({
			membershipId: "m-c-1",
			displayName: "José",
		});
		expect(parsed.decidedAt).toBe("2026-10-09T11:00:00Z");
		expect(parsed.rejectionReason).toMatch(/supervisor/);
	});

	it("parses the waiting submission on its publication, and none from an API before it (PR #164)", async () => {
		const submission = {
			approvalInstanceId: "ai-1",
			currentStepOrder: 1,
			currentStepLabel: "Endorse",
			stepCount: 2,
			submittedByCaller: true,
		};
		stubApi({
			[`GET ${SCHEDULES}/s-1`]: {
				status: 200,
				body: envelope(
					generatedScheduleFixture({
						status: "GENERATED",
						publication: {
							requiresApproval: true,
							stepLabels: ["Endorse", "Publish"],
							submission,
							rejectedAtStep: null,
							waitingForWeek: null,
						},
					})
				),
			},
			[`GET ${SCHEDULES}/s-2`]: {
				status: 200,
				body: envelope({
					...generatedScheduleFixture({ scheduleId: "s-2" }),
					publication: { requiresApproval: true, stepLabels: ["Publish"] },
				}),
			},
		});

		expect((await fetchSchedule("c-1", UNIT, "s-1")).publication).toEqual({
			requiresApproval: true,
			stepLabels: ["Endorse", "Publish"],
			submission,
			rejectedAtStep: null,
			waitingForWeek: null,
		});
		expect(
			(await fetchSchedule("c-1", UNIT, "s-2")).publication.submission
		).toBeNull();
	});

	it("parses the approval step that rejected a roster, and none from an API before it", async () => {
		stubApi({
			[`GET ${SCHEDULES}/s-1`]: {
				status: 200,
				body: envelope(
					generatedScheduleFixture({
						status: "REJECTED",
						publication: {
							requiresApproval: true,
							stepLabels: ["Endorse", "Publish"],
							submission: null,
							rejectedAtStep: { stepOrder: 2, stepLabel: "Publish" },
							waitingForWeek: null,
						},
					})
				),
			},
			[`GET ${SCHEDULES}/s-2`]: {
				status: 200,
				body: envelope({
					...generatedScheduleFixture({ scheduleId: "s-2" }),
					publication: { requiresApproval: true, stepLabels: ["Publish"] },
				}),
			},
		});

		expect(
			(await fetchSchedule("c-1", UNIT, "s-1")).publication.rejectedAtStep
		).toEqual({ stepOrder: 2, stepLabel: "Publish" });
		expect(
			(await fetchSchedule("c-1", UNIT, "s-2")).publication.rejectedAtStep
		).toBeNull();
	});

	it("given_aHeldUpWeek_when_parsed_then_itsPublicationNamesTheWeekItWaitsFor_andNoneFromAnApiBeforeIt", async () => {
		const waitingForWeek = {
			periodStart: "2026-11-09",
			periodEnd: "2026-11-15",
		};
		stubApi({
			[`GET ${SCHEDULES}/s-1`]: {
				status: 200,
				body: envelope(
					generatedScheduleFixture({
						status: "GENERATED",
						publication: {
							requiresApproval: false,
							stepLabels: [],
							submission: null,
							rejectedAtStep: null,
							waitingForWeek,
						},
					})
				),
			},
			[`GET ${SCHEDULES}/s-2`]: {
				status: 200,
				body: envelope({
					...generatedScheduleFixture({ scheduleId: "s-2" }),
					publication: { requiresApproval: false, stepLabels: [] },
				}),
			},
		});

		expect(
			(await fetchSchedule("c-1", UNIT, "s-1")).publication.waitingForWeek
		).toEqual(waitingForWeek);
		expect(
			(await fetchSchedule("c-1", UNIT, "s-2")).publication.waitingForWeek
		).toBeNull();
	});

	it("reads a schedule from an API without decisions as undecided", async () => {
		const decisionFields = ["decidedAt", "decidedBy", "rejectionReason"];
		const withoutDecision = Object.fromEntries(
			Object.entries(generatedScheduleFixture({ status: "GENERATED" })).filter(
				([field]) => !decisionFields.includes(field)
			)
		);
		stubApi({
			[`GET ${SCHEDULES}/s-1`]: {
				status: 200,
				body: envelope(withoutDecision),
			},
		});

		const parsed = await fetchSchedule("c-1", UNIT, "s-1");
		expect(parsed.decidedAt).toBeNull();
		expect(parsed.decidedBy).toBeNull();
		expect(parsed.rejectionReason).toBeNull();
	});

	it.each([
		["a draft", scheduleFixture(), false, false],
		["a requested schedule", generatedScheduleFixture(), false, false],
		[
			"a generated schedule",
			generatedScheduleFixture({ status: "GENERATED" }),
			true,
			true,
		],
		[
			"a generated schedule with a newer run still open",
			generatedScheduleFixture({
				status: "GENERATED",
				generation: generationFixture({
					status: "SUBMITTED",
					finishedAt: null,
				}),
			}),
			true,
			false,
		],
		[
			"a schedule whose generation failed",
			generatedScheduleFixture({ status: "GENERATION_FAILED" }),
			false,
			false,
		],
		[
			"a published schedule",
			generatedScheduleFixture({ status: "PUBLISHED" }),
			true,
			false,
		],
		[
			"a rejected schedule",
			generatedScheduleFixture({ status: "REJECTED" }),
			true,
			false,
		],
	])(
		"knows whether %s has a roster and awaits a decision",
		(_, schedule, roster, awaiting) => {
			expect(hasRoster(schedule)).toBe(roster);
			expect(decidable(schedule)).toBe(awaiting);
		}
	);
});

describe("what a schedule's status allows by hand", () => {
	it.each([
		["DRAFT", false, true],
		["GENERATION_FAILED", false, true],
		["GENERATED", true, true],
		["PUBLISHED", true, false],
		["REJECTED", false, true],
	] as const)(
		"given_a%sSchedule_when_asked_then_editable%sAndDeletable%s",
		(status, editable, removable) => {
			const schedule = generatedScheduleFixture({ status });
			expect(rosterEditable(schedule)).toBe(editable);
			expect(deletable(schedule)).toBe(removable);
		}
	);
});

describe("a schedule's roster", () => {
	it("reads a generated schedule's rows: shifts worked, days off and leave", async () => {
		const rows = scheduleAssignmentsFixture();
		const calls = stubApi({
			[`GET ${SCHEDULES}/s-1/assignments`]: {
				status: 200,
				body: envelope(rows),
			},
		});

		const parsed = await fetchScheduleAssignments("c-1", UNIT, "s-1");
		expect(parsed).toEqual(rows);
		expect(parsed).toHaveLength(21);
		expect(calls.map((call) => `${call.method} ${call.path}`)).toEqual([
			`GET ${SCHEDULES}/s-1/assignments`,
		]);
		expect(parsed.filter((row) => row.offReason === "LEAVE")).toHaveLength(2);
		expect(parsed[0]).toMatchObject({
			member: { displayName: "Aisha Rahman", employeeCode: "EMP-001" },
			off: false,
			shift: { name: "Front Desk AM", colour: "#E9A55A" },
			jobTitle: { name: "Front Desk Lead" },
		});
	});

	it("keeps a row whose member is gone, and one whose member is no longer named", async () => {
		const [first, second] = scheduleAssignmentsFixture() as [
			ScheduleAssignment,
			ScheduleAssignment,
		];
		const rows = [
			{ ...first, member: null },
			{ ...second, member: { ...second.member!, displayName: null } },
		];
		stubApi({
			[`GET ${SCHEDULES}/s-1/assignments`]: {
				status: 200,
				body: envelope(rows),
			},
		});

		await expect(fetchScheduleAssignments("c-1", UNIT, "s-1")).resolves.toEqual(
			rows
		);
	});

	it("reads no rows for a schedule that isn't generated", async () => {
		stubApi({
			[`GET ${SCHEDULES}/s-1/assignments`]: { status: 200, body: envelope([]) },
		});

		await expect(fetchScheduleAssignments("c-1", UNIT, "s-1")).resolves.toEqual(
			[]
		);
	});

	it("reads each day's type: a rest day, a worked rest day, a day off, and an absent day without one", async () => {
		const rows = scheduleAssignmentsFixture();
		stubApi({
			[`GET ${SCHEDULES}/s-1/assignments`]: {
				status: 200,
				body: envelope(rows),
			},
		});

		const parsed = await fetchScheduleAssignments("c-1", UNIT, "s-1");
		const dayOf = (name: string, day: string): ScheduleAssignment =>
			parsed.find(
				(row) => row.member?.displayName === name && row.day === day
			)!;

		expect(dayOf("Aisha Rahman", "2026-10-17")).toMatchObject({
			offReason: "OFF",
			dayType: "OFF",
		});
		expect(dayOf("Aisha Rahman", "2026-10-18")).toMatchObject({
			offReason: "OFF",
			dayType: "REST",
		});
		expect(dayOf("Ben Ong", "2026-10-18")).toMatchObject({
			offReason: "ABSENT",
			dayType: null,
		});
		expect(dayOf("Chen Wei", "2026-10-17")).toMatchObject({
			off: false,
			offReason: null,
			dayType: "REST",
		});
	});

	it("reads a reason it doesn't know as OFF, any day type as sent, and a missing day type as null", async () => {
		const [first, second] = scheduleAssignmentsFixture() as [
			ScheduleAssignment,
			ScheduleAssignment,
		];
		stubApi({
			[`GET ${SCHEDULES}/s-1/assignments`]: {
				status: 200,
				body: envelope([
					{
						...first,
						off: true,
						offReason: "SICK",
						dayType: "PUBLIC_HOLIDAY_OFF",
						shift: null,
						jobTitle: null,
					},
					// An older API sends no day type; undefined leaves the key out of the JSON.
					{ ...second, dayType: undefined },
				]),
			},
		});

		const [unknownReason, missingDayType] = await fetchScheduleAssignments(
			"c-1",
			UNIT,
			"s-1"
		);

		expect(unknownReason).toMatchObject({
			offReason: "OFF",
			dayType: "PUBLIC_HOLIDAY_OFF",
		});
		expect(missingDayType?.dayType).toBeNull();
	});

	it("reads a part-timer's row, and a member from an older API as not part-time", async () => {
		const [first, second] = scheduleAssignmentsFixture() as [
			ScheduleAssignment,
			ScheduleAssignment,
		];
		stubApi({
			[`GET ${SCHEDULES}/s-1/assignments`]: {
				status: 200,
				body: envelope([
					{ ...first, member: { ...first.member, partTime: true } },
					// undefined leaves the key out of the JSON, as an older API sends it.
					{ ...second, member: { ...second.member, partTime: undefined } },
				]),
			},
		});

		const [partTimer, olderApi] = await fetchScheduleAssignments(
			"c-1",
			UNIT,
			"s-1"
		);

		expect(partTimer?.member?.partTime).toBe(true);
		expect(olderApi?.member?.partTime).toBe(false);
	});

	it("reads the types a day can be made when not worked, and none from an older API", async () => {
		stubApi({
			[`GET ${SCHEDULES}/s-1`]: {
				status: 200,
				body: envelope(
					generatedScheduleFixture({
						nonWorkingDayTypes: ["OFF", "REST", "PUBLIC_HOLIDAY_OFF"],
					})
				),
			},
			[`GET ${SCHEDULES}/s-2`]: {
				status: 200,
				body: envelope({
					...generatedScheduleFixture({ scheduleId: "s-2" }),
					nonWorkingDayTypes: undefined,
				}),
			},
		});

		expect(
			(await fetchSchedule("c-1", UNIT, "s-1")).nonWorkingDayTypes
		).toEqual(["OFF", "REST", "PUBLIC_HOLIDAY_OFF"]);
		expect(
			(await fetchSchedule("c-1", UNIT, "s-2")).nonWorkingDayTypes
		).toEqual([]);
	});
});

describe("schedule refusals", () => {
	const t = authTestI18n.t;
	const problem = (status: number, errorCode: string): ApiProblemError =>
		new ApiProblemError({
			status,
			errorCode,
			fieldErrors: [],
			reason: "http",
			message: errorCode,
		});

	it("puts a week the department already has a schedule for on the period", () => {
		expect(
			scheduleRefusal(problem(409, "SCHEDULE_WEEK_TAKEN"), true, t).fields
		).toEqual({
			periodStart: "This department already has a schedule for that week.",
		});
	});

	it("puts a period that isn't a Monday on the period", () => {
		expect(
			scheduleRefusal(problem(400, "SCHEDULE_PERIOD_NOT_MONDAY"), true, t)
				.fields
		).toEqual({ periodStart: "Choose a period that starts on a Monday." });
	});

	it("puts a name the naming rule refuses on the name, even without field errors", () => {
		expect(
			scheduleRefusal(problem(400, "INVALID_SCHEDULE_NAME"), false, t).fields
		).toEqual({ name: "Check the schedule name and try again." });
	});

	it("explains a schedule that is no longer a draft, and a ticked shift that is gone", () => {
		expect(
			scheduleRefusal(problem(409, "SCHEDULE_NOT_DRAFT"), false, t).message
		).toBe("This schedule is no longer a draft, so it can’t be changed.");
		expect(
			scheduleRefusalMessage(problem(404, "SHIFT_NOT_FOUND"), false, t)
		).toBe("A chosen shift no longer exists. Check the shifts and try again.");
	});

	it("explains a ticked constraint that is gone or inactive", () => {
		expect(
			scheduleRefusalMessage(problem(404, "CONSTRAINT_NOT_FOUND"), false, t)
		).toBe(
			"A chosen constraint no longer exists. Check the constraints and try again."
		);
		expect(
			scheduleRefusalMessage(problem(409, "CONSTRAINT_INACTIVE"), false, t)
		).toBe(
			"A chosen constraint is inactive. Untick it or make it active, then try again."
		);
	});

	it("puts a refused field into one message where no field can show it", () => {
		expect(
			scheduleRefusalMessage(
				problem(400, "SCHEDULE_PERIOD_NOT_MONDAY"),
				false,
				t
			)
		).toBe("Choose a period that starts on a Monday.");
	});

	it.each([
		[
			"SCHEDULE_HAS_NO_SHIFTS",
			"Choose at least one shift before generating this schedule.",
		],
		[
			"SCHEDULE_HAS_NO_STAFFING_CONSTRAINT",
			"This schedule uses no staffing constraint on its shifts, so nobody would be rostered. Choose for this week on Setup.",
		],
		["SCHEDULE_NOT_DRAFT", "This schedule has already been generated."],
		[
			"SCHEDULE_WEEK_ALREADY_PUBLISHED",
			"This department already has a published roster for this week. Only one roster can be published per week, so schedule a different week instead.",
		],
		[
			"SCHEDULE_CONSTRAINT_UNUSABLE",
			"A chosen constraint names a shift this schedule doesn’t include or a job title that’s no longer active. Tick that shift, edit the constraint or untick it, then try again.",
		],
		[
			"SCHEDULE_PUBLISHED",
			"This roster is published, so it can’t be regenerated or deleted. Change its days on the roster instead.",
		],
		[
			"SCHEDULE_ONCE_PUBLISHED",
			"This roster was published once, so it can’t be regenerated. Change its days on the roster instead.",
		],
	])(
		"words a month week refused with %s in a week's own words",
		(code, copy) => {
			expect(refusalOfCode(code, t)).toBe(copy);
		}
	);

	it.each([
		[
			"SCHEDULE_GENERATION_IN_PROGRESS",
			409,
			"This schedule is being generated. Try again once the run finishes.",
		],
		[
			"PUBLISHED_SCHEDULE_NOT_DELETABLE",
			409,
			"This schedule is published, so it can’t be deleted. Change its days on the roster instead.",
		],
		["SCHEDULE_NOT_FOUND", 404, "This schedule no longer exists."],
		[
			"ACCESS_DENIED",
			403,
			"You no longer have permission to delete this schedule.",
		],
	])("explains a delete refused with %s", (code, status, copy) => {
		expect(deleteRefusal(problem(status, code), t)).toBe(copy);
	});

	it("falls back to a plain failure for a delete", () => {
		expect(deleteRefusal(new Error("offline"), t)).toBe(
			"We couldn’t delete the schedule. Try again."
		);
	});

	it.each([
		[
			"SCHEDULE_HAS_NO_EMPLOYEES",
			"This department has no employees who can be scheduled. Give at least one active member of the department a job title, then try again.",
		],
		[
			"SCHEDULE_WEEK_TAKEN",
			"This department already has a schedule for that week.",
		],
		[
			"SCHEDULE_GENERATION_IN_PROGRESS",
			"This schedule is being generated. Try again once the run finishes.",
		],
		["SOMETHING_NEW", "We couldn’t generate the schedule. Try again."],
	])("words a month week refused with %s", (code, copy) => {
		expect(refusalOfCode(code, t)).toBe(copy);
	});

	it.each([
		[
			"MONTH_WEEK_CHOICE_MISSING",
			400,
			"A week of this month was set up while you were here. Reload the page and generate again.",
		],
		[
			"AUTHORIZATION_DENIED",
			403,
			"You don’t have permission to generate this month here.",
		],
	])("explains a month generation refused with %s", (code, status, copy) => {
		expect(monthGenerationRefusal(problem(status, code), t)).toBe(copy);
	});

	it("falls back to a plain failure for a month generation", () => {
		expect(monthGenerationRefusal(new Error("offline"), t)).toBe(
			"We couldn’t generate the month. Try again."
		);
	});

	it.each([
		[
			"SCHEDULE_GENERATION_IN_PROGRESS",
			409,
			"This schedule is being generated. Try again once the run finishes.",
		],
		[
			"SCHEDULE_NOT_GENERATED",
			409,
			"This schedule has no generated roster to publish or reject.",
		],
		[
			"SCHEDULE_ALREADY_DECIDED",
			409,
			"This roster was already published or rejected. Reload the page to see it.",
		],
		[
			"SCHEDULE_WEEK_ALREADY_PUBLISHED",
			409,
			"This department already has a published roster for this week. Only one roster can be published per week, so schedule a different week instead.",
		],
		[
			"SCHEDULE_EARLIER_WEEK_UNPUBLISHED",
			409,
			"Publish the earlier week first. Weeks are published in order.",
		],
		["SCHEDULE_NOT_FOUND", 404, "This schedule no longer exists."],
		[
			"ACCESS_DENIED",
			403,
			"You no longer have permission to publish or reject this roster.",
		],
	])("explains a decision refused with %s", (code, status, copy) => {
		expect(decisionRefusal(problem(status, code), t).message).toBe(copy);
	});

	it("puts a refused rejection reason on the reason field", () => {
		expect(
			decisionRefusal(problem(400, "INVALID_REJECTION_REASON"), t).fields
		).toEqual({ reason: "Enter a reason of up to 2,000 characters." });
	});

	it.each([
		[
			"SCHEDULE_NOT_PUBLISHED",
			409,
			"This roster isn’t published any more. Reload the page to see it.",
		],
		["SCHEDULE_NOT_FOUND", 404, "This schedule no longer exists."],
		[
			"ACCESS_DENIED",
			403,
			"You no longer have permission to withdraw this roster’s publication.",
		],
	])("explains a withdrawal refused with %s", (code, status, copy) => {
		expect(withdrawalRefusal(problem(status, code), t).message).toBe(copy);
	});

	it("puts a refused withdrawal remark on the remark field", () => {
		expect(
			withdrawalRefusal(
				problem(400, "INVALID_PUBLICATION_WITHDRAWAL_REMARK"),
				t
			).fields
		).toEqual({ remark: "Enter a remark of up to 500 characters." });
	});

	it("knows only a published roster with no run open can have its publication withdrawn", () => {
		expect(
			withdrawable(generatedScheduleFixture({ status: "PUBLISHED" }))
		).toBe(true);
		expect(
			withdrawable(generatedScheduleFixture({ status: "GENERATED" }))
		).toBe(false);
	});

	it("falls back to a plain failure for a decision", () => {
		expect(decisionRefusal(new Error("offline"), t).message).toBe(
			"We couldn’t save the decision. Try again."
		);
	});
});

describe("scheduleAssignmentsQuery", () => {
	it("keeps the same run's older revision on screen while a newer one loads, never another run's rows", () => {
		const rows = scheduleAssignmentsFixture();
		const placeholder = scheduleAssignmentsQuery("c-1", UNIT, "s-1", "r-1", 3)
			.placeholderData as (
			previous: unknown,
			previousQuery: { queryKey: ReadonlyArray<unknown> } | undefined
		) => unknown;

		expect(
			placeholder(rows, {
				queryKey: scheduleAssignmentsKey("c-1", "s-1", "r-1", 2),
			})
		).toBe(rows);
		expect(
			placeholder(rows, {
				queryKey: scheduleAssignmentsKey("c-1", "s-1", "r-0", 2),
			})
		).toBeUndefined();
	});
});
