import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configureApiClient, resetApiClient } from "@/common/api-client";
import { envelope, stubApi } from "@/common/testing/stubApi";
import {
	datesPlanQuery,
	fetchDatesPlan,
	generateDates,
} from "@/features/scheduling/dates/api";
import {
	datesGenerationFixture,
	datesPlanFixture,
} from "@/features/scheduling/dates/fixtures";

const DATES = "/api/v1/companies/c-1/schedule-dates";
const DAYS = { firstDay: "2026-11-19", lastDay: "2026-11-28" };

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

describe("schedules by dates client", () => {
	it("given_dates_when_planned_then_asksWithTheDepartmentAndDaysInTheQueryAndParsesEachWeek", async () => {
		const calls = stubApi({
			[`GET ${DATES}/plan`]: {
				status: 200,
				body: envelope(datesPlanFixture()),
			},
		});

		const plan = await fetchDatesPlan("c-1", "d-1", DAYS);

		expect(plan).toEqual(datesPlanFixture());
		expect(calls[0]?.search).toBe(
			"departmentId=d-1&firstDay=2026-11-19&lastDay=2026-11-28"
		);
	});

	it("given_anActionANewerApiAdds_when_parsed_then_readsAsUnknown", async () => {
		const plan = datesPlanFixture();
		stubApi({
			[`GET ${DATES}/plan`]: {
				status: 200,
				body: envelope({
					...plan,
					weeks: [{ ...plan.weeks[0], action: "SPLIT" }],
				}),
			},
		});

		const parsed = await fetchDatesPlan("c-1", "d-1", DAYS);

		expect(parsed.weeks[0]?.action).toBe("UNKNOWN");
	});

	it("given_aGeneration_when_posted_then_sendsTheBodyWithTheDepartmentInTheQueryOnly", async () => {
		const calls = stubApi({
			[`POST ${DATES}/generation`]: {
				status: 200,
				body: envelope(datesGenerationFixture()),
			},
		});
		const body = {
			...DAYS,
			name: "Year-end gala",
			includeLeave: true,
			newWeeks: [
				{
					periodStart: "2026-11-16",
					includedShiftIds: ["sh-1"],
					includedConstraintIds: ["co-1"],
				},
			],
		};

		await expect(generateDates("c-1", "d-1", body)).resolves.toEqual(
			datesGenerationFixture()
		);
		expect(calls[0]?.search).toBe("departmentId=d-1");
		expect(calls[0]?.body).toEqual(body);
	});

	it("given_noPermission_when_queried_then_asksForNothingAndItsKeyIsUnderScheduling", () => {
		const query = datesPlanQuery(
			"c-1",
			"d-1",
			DAYS.firstDay,
			DAYS.lastDay,
			false
		);

		expect(typeof query.queryFn).not.toBe("function");
		expect(query.queryKey.slice(0, 3)).toEqual(["scheduling", "c-1", "dates"]);
	});
});
