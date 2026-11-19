import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configureApiClient, resetApiClient } from "@/common/api-client";
import { envelope, stubApi } from "@/common/testing/stubApi";
import { schedulesKey } from "@/features/scheduling/schedules/api";
import {
	deletedScheduleSchema,
	deletedSchedulesInUnitsKey,
	fetchDeletedSchedules,
} from "@/features/scheduling/schedules/deletedSchedules";
import {
	deletedScheduleFixture,
	generatedScheduleFixture,
} from "@/features/scheduling/schedules/fixtures";

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

const DELETED = "GET /api/v1/companies/c-1/deleted-schedules";

const page = (content: Array<unknown>, hasNext: boolean): unknown =>
	envelope({ content, page: { hasNext } });

describe("deletedScheduleSchema", () => {
	it("reads a schedule's own fields with its deletion", () => {
		const deleted = deletedScheduleFixture();

		expect(deletedScheduleSchema.parse(deleted)).toEqual(deleted);
	});

	it.each([
		["no name", { deletedByName: null, cause: "MANAGER" }],
		["no cause", { deletedByName: "Lina Tan", cause: null }],
		["neither who nor why", { deletedByName: null, cause: null }],
	] as const)("reads a deletion with %s as the API sends it", (_, recorded) => {
		const deletion = { deletedAt: "2026-10-15T03:00:00Z", ...recorded };

		expect(
			deletedScheduleSchema.parse(deletedScheduleFixture({ deletion })).deletion
		).toEqual(deletion);
	});

	it("reads a row as the API builds it: once published, with a field this build does not know", () => {
		const row = deletedScheduleFixture({
			wasPublished: true,
			publicationWithdrawnAt: "2026-10-14T02:00:00Z",
		});

		const parsed = deletedScheduleSchema.parse({
			...row,
			publication: { ...row.publication, waitingForWeek: null },
		});

		expect(parsed).toEqual(row);
	});

	it("reads a cause this build does not know as none, so the row still shows", () => {
		const parsed = deletedScheduleSchema.parse({
			...deletedScheduleFixture(),
			deletion: {
				deletedAt: "2026-10-15T03:00:00Z",
				deletedByName: "Lina Tan",
				cause: "ARCHIVED",
			},
		});

		expect(parsed.deletion.cause).toBeNull();
	});

	it("refuses a row without its deletion, which would be a live schedule", () => {
		const live = generatedScheduleFixture({ status: "GENERATED" });

		expect(deletedScheduleSchema.safeParse(live).success).toBe(false);
	});
});

describe("fetchDeletedSchedules", () => {
	it("reads every page, newest deletion first", async () => {
		const first = deletedScheduleFixture({ scheduleId: "s-1" });
		const second = deletedScheduleFixture({ scheduleId: "s-2" });
		const calls = stubApi({
			[DELETED]: [
				{ status: 200, body: page([first], true) },
				{ status: 200, body: page([second], false) },
			],
		});

		await expect(fetchDeletedSchedules("c-1", {})).resolves.toEqual([
			first,
			second,
		]);
		const sent = calls.map((call) => new URLSearchParams(call.search));
		expect(sent.map((search) => search.get("page"))).toEqual(["0", "1"]);
		expect(sent.map((search) => search.get("sort"))).toEqual([
			"deletedAt,desc",
			"deletedAt,desc",
		]);
	});

	it("sends the chosen Branch and Department, and neither for every one in scope", async () => {
		const calls = stubApi({
			[DELETED]: [
				{ status: 200, body: page([], false) },
				{ status: 200, body: page([], false) },
			],
		});

		await fetchDeletedSchedules("c-1", {
			branchId: "b-1",
			departmentId: "d-1",
		});
		await fetchDeletedSchedules("c-1", {});

		const sent = calls.map((call) => new URLSearchParams(call.search));
		expect(sent.map((search) => search.get("branchId"))).toEqual(["b-1", null]);
		expect(sent.map((search) => search.get("departmentId"))).toEqual([
			"d-1",
			null,
		]);
	});
});

describe("deletedSchedulesInUnitsKey", () => {
	it("sits under the live lists' key, so deleting a schedule refreshes it", () => {
		const key = deletedSchedulesInUnitsKey("c-1", { departmentId: "d-1" });

		expect(key.slice(0, schedulesKey("c-1").length)).toEqual(
			schedulesKey("c-1")
		);
	});
});
