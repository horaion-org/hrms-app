import { describe, expect, it } from "vitest";
import { authTestI18n } from "@/features/auth/testingI18n";
import {
	weekStateSchema,
	type WeekState,
} from "@/features/scheduling/months/api";
import {
	coverDays,
	twoPartWeekFixture,
} from "@/features/scheduling/months/fixtures";
import {
	anyWeekGenerating,
	hasRoster,
	showsCoverSummary,
	weekAction,
	weekStateTones,
} from "@/features/scheduling/months/weekStateLooks";

const STATES = weekStateSchema.unwrap().options;

describe("weekStateTones", () => {
	it("given_everyState_when_looked_up_then_eachHasAToneAndWords", () => {
		for (const state of STATES) {
			expect(weekStateTones[state]).toBeDefined();
			expect(authTestI18n.exists(`scheduling.months.states.${state}`)).toBe(
				true
			);
		}
	});
});

describe("hasRoster", () => {
	it.each(STATES)(
		"given_%s_when_asked_then_onlyTheTwoRosterStatesHaveOne",
		(state) => {
			expect(hasRoster(state)).toBe(["PUBLISHED", "TO_REVIEW"].includes(state));
		}
	);
});

describe("weekAction", () => {
	it("given_theWeekUnderReview_when_asked_then_review", () => {
		expect(weekAction({ state: "TO_REVIEW", scheduleId: "s-2" })).toBe(
			"review"
		);
	});

	it.each([
		"PUBLISHED",
		"GENERATING",
		"FAILED",
		"REJECTED",
		"DRAFT",
		"UNKNOWN",
	] as const)("given_%s_withASchedule_when_asked_then_open", (state) => {
		expect(weekAction({ state, scheduleId: "s-1" })).toBe("open");
	});

	it("given_aWeekWithoutASchedule_when_asked_then_noAction", () => {
		expect(weekAction({ state: "NOT_GENERATED", scheduleId: null })).toBe(
			undefined
		);
	});
});

describe("showsCoverSummary", () => {
	/** A week whose newest part is `state`, with the earlier parts' states and its days sent or not. */
	const week = (
		state: WeekState,
		earlierStates: Array<WeekState>,
		daysSent: boolean
	): Parameters<typeof showsCoverSummary>[0] => {
		const [part] = twoPartWeekFixture();
		const states = [...earlierStates, state];
		return {
			state,
			days: daysSent ? coverDays("2027-02-15") : [],
			parts:
				states.length < 2
					? []
					: states.map((each, index) => ({
							...part!,
							scheduleId: `s-${index + 1}`,
							state: each,
						})),
		};
	};

	it.each([
		["oneScheduleToReview", week("TO_REVIEW", [], true), true],
		["oneSchedulePublished", week("PUBLISHED", [], true), true],
		["oneScheduleGenerating", week("GENERATING", [], false), false],
		[
			"newestGeneratingAfterAPublishedPart",
			week("GENERATING", ["PUBLISHED"], true),
			true,
		],
		[
			"newestFailedAfterAPartToReview",
			week("FAILED", ["TO_REVIEW"], true),
			true,
		],
		[
			"newestGeneratingAndNoDaysSent",
			week("GENERATING", ["PUBLISHED"], false),
			false,
		],
		["noPartWithARoster", week("GENERATING", ["FAILED"], true), false],
	])("given_%s_when_asked_then_%s", (_case, given, shows) => {
		expect(showsCoverSummary(given)).toBe(shows);
	});
});

describe("anyWeekGenerating", () => {
	const [first, second] = twoPartWeekFixture();
	it.each([
		["aWeekGenerating", [{ state: "GENERATING" as const, parts: [] }], true],
		[
			"anEarlierPartGenerating",
			[
				{
					state: "PUBLISHED" as const,
					parts: [{ ...first!, state: "GENERATING" as const }, second!],
				},
			],
			true,
		],
		[
			"nothingGenerating",
			[{ state: "TO_REVIEW" as const, parts: [first!, second!] }],
			false,
		],
		["noWeeks", [], false],
	])("given_%s_then_%s", (_, weeks, expected) => {
		expect(anyWeekGenerating(weeks)).toBe(expected);
	});
});
