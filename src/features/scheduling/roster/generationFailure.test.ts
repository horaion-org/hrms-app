import { createInstance, type TFunction } from "i18next";
import { beforeAll, describe, expect, it } from "vitest";
import en from "@/assets/locales/en/translations.json";
import { generationFailure } from "@/features/scheduling/roster/generationFailure";
import type { ScheduleGeneration } from "@/features/scheduling/schedules/api";
import {
	generationFindingsFixture,
	generationFixture,
} from "@/features/scheduling/schedules/fixtures";

let t: TFunction;
beforeAll(async () => {
	const i18n = createInstance();
	await i18n.init({ lng: "en", resources: { en: { translation: en } } });
	t = i18n.t;
});

const failedWith = (errorCode: string | null): ScheduleGeneration =>
	generationFixture({
		status: "FAILED",
		engineOutcome: null,
		errorCode,
		findings: null,
	});

describe("generationFailure", () => {
	it.each([
		[
			"snapshot_invalid",
			"The engine couldn’t use this schedule’s shifts and constraints.",
		],
		[
			"engine_unreachable",
			"The scheduling engine couldn’t be reached in time, so nothing was generated.",
		],
		[
			"CANCELLED",
			"Generating stopped before a roster was saved. Generate again.",
		],
		[
			"too_many_jobs",
			"The scheduling engine was busy. Generate again in a few minutes.",
		],
		[
			"engine_run_timed_out",
			"The scheduling engine didn’t finish this week’s roster in time, so generating was stopped. Generate again; if it keeps failing, contact support.",
		],
		[
			"redone_days_changed",
			"The days this schedule redoes were published or started generating while it ran, so nothing changed. Generate it again, or delete it.",
		],
		[
			"engine_http_503",
			"The scheduling engine returned an error, so nothing was generated. Generate again; if it keeps failing, contact support.",
		],
		[
			"rule.soft_not_allowed",
			"This scheduling engine can’t run a rule set to If possible yet. Set those rules to Must, then generate again.",
		],
		[
			"rule.days_not_worked_together_not_supported",
			"This scheduling engine can’t keep days off together yet. Remove the “Keep days off together” rule from this schedule, then generate again.",
		],
		["a_code_added_later", "This schedule couldn’t be generated."],
	])(
		"given_aRunThatFailedWith_%s_when_explained_then_saysWhyAndShowsTheCode",
		(code, message) => {
			expect(generationFailure(failedWith(code), t)).toEqual({
				message,
				code,
			});
		}
	);

	it("given_aSucceededRunThatKeptARetryCode_when_explained_then_ignoresTheCode", () => {
		const infeasible = generationFixture({
			status: "SUCCEEDED",
			engineOutcome: "INFEASIBLE",
			errorCode: "too_many_jobs",
			findings: generationFindingsFixture({ scheduleStatus: "INFEASIBLE" }),
		});

		expect(generationFailure(infeasible, t)).toEqual({
			message:
				"No roster could meet every shift and constraint of this schedule.",
			code: null,
		});
	});

	it.each([
		["no run", null],
		["a failed run without a code", failedWith(null)],
	])("given_%s_when_explained_then_saysItFailed", (_, generation) => {
		expect(generationFailure(generation, t)).toEqual({
			message: "This schedule couldn’t be generated.",
			code: null,
		});
	});

	it("given_aMonthWeeksFailure_when_worded_then_readsLikeASchedulesGeneration", () => {
		expect(
			generationFailure(
				{
					status: "FAILED",
					errorCode: "engine_unreachable",
					engineOutcome: null,
				},
				t
			)
		).toEqual({
			message:
				"The scheduling engine couldn’t be reached in time, so nothing was generated.",
			code: "engine_unreachable",
		});
		expect(
			generationFailure(
				{ status: "SUCCEEDED", errorCode: null, engineOutcome: "INFEASIBLE" },
				t
			).code
		).toBeNull();
	});
});
