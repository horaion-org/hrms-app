import type { TFunction } from "i18next";
import { describe, expect, it } from "vitest";
import {
	generatedScheduleFixture,
	scheduleFixture,
} from "@/features/scheduling/schedules/fixtures";
import { scheduleDetailItems } from "./scheduleDetails";

/** Echoes the key and its values, so the rows can be read without copy. */
const t = ((key: string, values?: Record<string, string>) =>
	values ? `${key}(${Object.values(values).join("|")})` : key) as TFunction;
const moment = (instant: string): string => `at ${instant}`;

describe("scheduleDetailItems", () => {
	it("tells a published schedule's requester, run end, decision and zone", () => {
		expect(
			scheduleDetailItems(
				generatedScheduleFixture({ status: "PUBLISHED" }),
				moment,
				t
			).map((item) => item.label)
		).toEqual([
			"scheduling.detail.details.requested",
			"scheduling.detail.details.finished",
			"scheduling.detail.details.published",
			"scheduling.detail.details.timeZone",
		]);
	});

	it("names a requester who is gone a former member", () => {
		const [requested] = scheduleDetailItems(
			generatedScheduleFixture({
				generationRequestedBy: { membershipId: "m-x", displayName: null },
			}),
			moment,
			t
		);

		expect(requested?.value).toBe(
			"scheduling.detail.details.byAt(scheduling.detail.formerMember|at 2026-10-09T10:00:00Z)"
		);
	});

	it("tells only the zone of a draft", () => {
		expect(scheduleDetailItems(scheduleFixture(), moment, t)).toEqual([
			{ label: "scheduling.detail.details.timeZone", value: "Asia/Singapore" },
		]);
	});
});
