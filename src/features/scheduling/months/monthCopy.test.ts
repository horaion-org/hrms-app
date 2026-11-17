import { describe, expect, it } from "vitest";
import { authTestI18n } from "@/features/auth/testingI18n";
import { datesPlanFixture } from "@/features/scheduling/dates/fixtures";
import {
	datesRunHint,
	monthUsesLine,
	setupNextNoteOf,
	stateCountsLine,
	tickedWeeksHint,
	weekChangedRefusal,
	weekRangeText,
	type SetupNextFacts,
} from "@/features/scheduling/months/monthCopy";
import type { Gate } from "@/features/scheduling/readiness/readinessCopy";
import { ungeneratedMonthFixture } from "@/features/scheduling/months/fixtures";

describe("stateCountsLine", () => {
	it("given_aMonthsWeeks_when_said_then_publishedFirstAndPluralsByCount", () => {
		expect(
			stateCountsLine(
				[
					{ state: "TO_REVIEW" },
					{ state: "PUBLISHED" },
					{ state: "PUBLISHED" },
					{ state: "TO_REVIEW" },
					{ state: "DRAFT" },
					{ state: "NOT_GENERATED" },
				],
				authTestI18n.t
			)
		).toBe("2 published · 2 to review · 1 draft");
	});

	it("given_onlyWeeksNotGeneratedYet_when_said_then_nothing", () => {
		expect(stateCountsLine([{ state: "NOT_GENERATED" }], authTestI18n.t)).toBe(
			""
		);
	});
});

describe("weekRangeText", () => {
	it("given_aWeek_when_said_then_itsFirstAndLastDayWithTheirWeekdays", () => {
		expect(
			weekRangeText(
				{ start: "2026-11-23", end: "2026-11-29" },
				"en-GB",
				authTestI18n.t
			)
		).toBe("Mon 23 Nov to Sun 29 Nov");
	});
});

describe("weekChangedRefusal", () => {
	it("given_aSentWeekPublishedAndAnotherOverSinceTheRead_when_said_then_namesEachWithWhyAndThatNothingWasGenerated", () => {
		const month = ungeneratedMonthFixture();
		month.weeks[0] = {
			...month.weeks[0]!,
			state: "PUBLISHED",
			includedInMonthGeneration: false,
		};
		month.weeks[1] = { ...month.weeks[1]!, includedInMonthGeneration: false };

		expect(
			weekChangedRefusal(
				["2026-12-07", "2026-12-14", "2026-12-21"],
				month,
				"en-GB",
				authTestI18n.t
			)
		).toMatch(
			/^The week of 7\s?–\s?13\sDec was published since this page loaded, so it can’t be generated\. The week of 14\s?–\s?20\sDec is over, so it can’t be generated\. Nothing was generated\. The page now shows December as it is; try again for the other weeks\.$/
		);
	});

	it("given_noSentWeekChangedInTheReadYet_when_said_then_oneLineForTheMonth", () => {
		expect(
			weekChangedRefusal(
				["2026-12-07"],
				ungeneratedMonthFixture(),
				"en-GB",
				authTestI18n.t
			)
		).toBe(
			"A week of December changed since this page loaded, so nothing was generated. The page now shows December as it is; try again."
		);
	});
});

describe("monthUsesLine", () => {
	const everything = {
		shiftIds: ["sh-1", "sh-2"],
		constraintIds: ["c-1", "c-2", "c-3"],
	};

	it("given_noWeekLeavesAnythingOut_when_said_then_everyWeekUsesTheWholeSetup", () => {
		expect(
			monthUsesLine(
				authTestI18n.t,
				[
					{ label: "7 – 13 Dec", leftOut: 0 },
					{ label: "14 – 20 Dec", leftOut: 0 },
				],
				everything,
				"Kitchen",
				"en-GB"
			)
		).toBe("Every week uses all 2 shifts and 3 constraints of Kitchen.");
	});

	it("given_twoWeeksLeaveSomethingOut_when_said_then_countsTheRestAndNamesEachChangedWeek", () => {
		expect(
			monthUsesLine(
				authTestI18n.t,
				[
					{ label: "7 – 13 Dec", leftOut: 1 },
					{ label: "14 – 20 Dec", leftOut: 0 },
					{ label: "21 – 27 Dec", leftOut: 2 },
				],
				everything,
				"Kitchen",
				"en-GB"
			)
		).toBe(
			"1 of 3 weeks uses everything of Kitchen. Changed: 7 – 13 Dec (1 left out) and 21 – 27 Dec (2 left out)."
		);
	});
});

describe("setupNextNoteOf", () => {
	/** A Department chosen, its lists read and a week ticked: Next submits. */
	const ready: SetupNextFacts = {
		gate: undefined,
		departmentName: "Kitchen",
		listsHidden: false,
		listsRead: true,
		nothingToGenerate: false,
	};
	const gate: Gate = {
		messageKey: "scheduling.gate.nothing",
		linkTo: "shifts",
		linkKey: "scheduling.gate.setUp",
		nextNoteKey: "scheduling.gate.nothingNote",
		department: "Kitchen",
	};

	it.each<[string, Partial<SetupNextFacts>, string | undefined]>([
		["readyToSubmit", {}, undefined],
		[
			"aGate",
			{ gate, listsHidden: true, nothingToGenerate: true },
			"Set up shifts and a staffing constraint for Kitchen first.",
		],
		[
			"hiddenLists",
			{ listsHidden: true, listsRead: false, nothingToGenerate: true },
			"You need to see Kitchen’s shifts and constraints to create its schedule.",
		],
		["listsStillLoading", { listsRead: false }, ""],
		["nothingToGenerate", { nothingToGenerate: true }, ""],
		[
			"noDepartmentYet",
			{ departmentName: undefined, listsRead: false },
			undefined,
		],
		[
			"noDepartmentYetAndNothingToGenerate",
			{ departmentName: undefined, listsRead: false, nothingToGenerate: true },
			"",
		],
	])("given_%s_when_noted_then_theNoteOrNone", (_, facts, note) => {
		expect(setupNextNoteOf({ ...ready, ...facts }, authTestI18n.t)).toBe(note);
	});
});

describe("tickedWeeksHint", () => {
	it("given_twoTouchingTickedWeeks_when_said_then_oneRangeAndTheirCount", () => {
		expect(
			tickedWeeksHint(["2026-12-07", "2026-12-14"], "en", authTestI18n.t)
		).toMatch(
			/^Generating works out the 2 weeks you ticked: Mon.*Dec 7.*Sun.*Dec 20\./
		);
	});

	it("given_nothingTicked_when_said_then_nothing", () => {
		expect(tickedWeeksHint([], "en", authTestI18n.t)).toBe("");
	});
});

describe("datesRunHint", () => {
	it("given_aPlan_when_said_then_itsNewDaysFromTheFirstToTheLast", () => {
		expect(datesRunHint(datesPlanFixture(), "en", authTestI18n.t)).toMatch(
			/^Generating works out 10 days, Nov 19\s?–\s?28, 2026\./
		);
	});

	it("given_noPlan_when_said_then_nothing", () => {
		expect(datesRunHint(undefined, "en", authTestI18n.t)).toBe("");
	});
});
