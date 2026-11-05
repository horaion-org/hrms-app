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
			"history_invalid",
			"The scheduling engine couldn’t read the days before this week. Contact support: the schedule can be generated again once they’re cleared.",
		],
		["CANCELLED", "The engine’s job was cancelled before it finished."],
		[
			"engine_http_503",
			"The scheduling engine answered with an error (HTTP 503).",
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
});
