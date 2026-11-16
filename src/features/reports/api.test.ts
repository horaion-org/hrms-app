import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configureApiClient, resetApiClient } from "@/common/api-client";
import { envelope, stubApi } from "@/common/testing/stubApi";
import {
	overtimeFixture,
	shortageFixture,
	staffingRuleFixture,
} from "@/features/dashboard/fixtures";
import {
	fetchReportOvertime,
	fetchReportShortages,
	fetchReportStaffing,
	fetchRosterChanges,
} from "@/features/reports/api";
import { rosterChangeDepartmentFixture } from "@/features/reports/fixtures";

const REPORTS = "/api/v1/companies/c-1/reports";
const NOVEMBER = { from: "2026-11-01", to: "2026-11-30" };

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

// Reports reads its own routes, under `report:read`, never the schedules routes Home reads.
describe("reports reads", () => {
	it("reads the shifts short from the reports route", async () => {
		stubApi({
			[`GET ${REPORTS}/shortages`]: {
				status: 200,
				body: envelope({ ...NOVEMBER, shortages: [shortageFixture()] }),
			},
		});

		await expect(fetchReportShortages("c-1", {}, NOVEMBER)).resolves.toEqual([
			shortageFixture(),
		]);
	});

	it("reads staffing by rule from the reports route", async () => {
		const calls = stubApi({
			[`GET ${REPORTS}/staffing`]: {
				status: 200,
				body: envelope({ ...NOVEMBER, rules: [staffingRuleFixture()] }),
			},
		});

		await expect(fetchReportStaffing("c-1", {}, NOVEMBER)).resolves.toEqual([
			staffingRuleFixture(),
		]);
		expect(calls[0]?.search).toBe("from=2026-11-01&to=2026-11-30");
	});

	it("reads overtime by department and month from the reports route", async () => {
		const calls = stubApi({
			[`GET ${REPORTS}/overtime`]: {
				status: 200,
				body: envelope(overtimeFixture()),
			},
		});

		const overtime = await fetchReportOvertime(
			"c-1",
			{},
			{ from: "2026-11", to: "2026-11" }
		);

		expect(overtime.nearSharePercent).toBe(80);
		expect(overtime.departments[0]?.members[0]?.standing).toBe("OVER");
		expect(calls[0]?.search).toBe("from=2026-11&to=2026-11");
	});

	it("reads the changes to published rosters from the reports route", async () => {
		stubApi({
			[`GET ${REPORTS}/roster-changes`]: {
				status: 200,
				body: envelope({
					...NOVEMBER,
					departments: [rosterChangeDepartmentFixture()],
				}),
			},
		});

		await expect(fetchRosterChanges("c-1", {}, NOVEMBER)).resolves.toEqual([
			rosterChangeDepartmentFixture(),
		]);
	});
});
