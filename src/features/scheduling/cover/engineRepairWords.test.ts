import { createInstance, type TFunction } from "i18next";
import { beforeAll, describe, expect, it } from "vitest";
import en from "@/assets/locales/en/translations.json";
import es from "@/assets/locales/es/translations.json";
import { ApiProblemError } from "@/common/problem";
import {
	callInOption,
	daySwapOption,
	moveOption,
	oneOfTwoOption,
	otherTwoPeopleOption,
	restDayCallInOption,
	stretchAfterOption,
	stretchAfterOtherDayOption,
	stretchBeforeOption,
	stretchBeforeOtherDayOption,
	stretchPairOption,
} from "@/features/scheduling/cover/engineRepairFixtures";
import { scheduleAssignmentsFixture } from "@/features/scheduling/schedules/fixtures";
import { assignmentCell } from "@/features/scheduling/rosterChanges/cellText";
import {
	clockTime,
	costChips,
	optionKindLine,
	optionSentences,
	REFUSAL_ACTIONS,
	stillShortToast,
	weekLine,
	whatItLeaves,
	type OptionWordSources,
	repairRefusalOf,
} from "@/features/scheduling/cover/engineRepairWords";

let t: TFunction;
let spanish: TFunction;

beforeAll(async () => {
	const i18n = createInstance();
	await i18n.init({
		lng: "en",
		resources: { en: { translation: en }, es: { translation: es } },
	});
	t = i18n.t;
	spanish = i18n.getFixedT("es");
});

/** A refusal as the API client raises it. */
const problem = (errorCode: string): ApiProblemError =>
	new ApiProblemError({
		message: "Refused",
		status: 409,
		errorCode,
		fieldErrors: [],
		reason: "http",
	});

describe("repairRefusalOf", () => {
	it.each([
		["REPAIR_GAP_NOT_SEEN_BY_ENGINE", "notSeenByEngine"],
		["REPAIR_GAP_EXPIRED", "expired"],
		["REPAIR_NO_ENGINE_JOB", "expired"],
		["REPAIR_ENGINE_NOT_CONFIGURED", "notConnected"],
		["ROSTER_REVISION_CONFLICT", "rosterMoved"],
		["REPAIR_ENGINE_TOO_SLOW", "tooSlow"],
		["REPAIR_ENGINE_FAILED", "failed"],
	] as const)("reads %s as %s", (code, refusal) => {
		expect(repairRefusalOf(problem(code))).toBe(refusal);
	});

	it("reads anything else as the engine failing", () => {
		expect(repairRefusalOf(new Error("offline"))).toBe("failed");
	});
});

describe("clockTime", () => {
	it("keeps a local date-time's clock time, and nothing for an unknown one", () => {
		expect(clockTime("2026-10-17T09:00:00")).toBe("09:00");
		expect(clockTime(null)).toBe("");
	});
});

/** The fixture roster's days as the words read them, and weekdays by name. */
const sources: OptionWordSources = {
	dayBefore: (cell) => {
		const row = scheduleAssignmentsFixture().find(
			(candidate) =>
				candidate.member?.membershipId === cell.membershipId &&
				candidate.day === cell.day
		);
		return row && assignmentCell(row);
	},
	weekday: (isoDate) =>
		new Intl.DateTimeFormat("en", { weekday: "long", timeZone: "UTC" }).format(
			new Date(isoDate)
		),
	gapDay: "2026-10-17",
};

describe("optionKindLine", () => {
	it.each([
		["a call-in on a day off", callInOption(), "Comes in on a day off"],
		[
			"a call-in on a rest day",
			restDayCallInOption(),
			"Comes in on a rest day",
		],
		["a move", moveOption(), "Moves from Lunch Rush"],
		["a stretch after", stretchAfterOption(), "Stays on 2 h"],
		["a stretch before", stretchBeforeOption(), "Starts 2 h early"],
		["a stretch pair", stretchPairOption(), "Cover it between them"],
		["a day swap", daySwapOption(), "Works Saturday instead of Friday"],
		["the older repair's two changes", otherTwoPeopleOption(), "2 changes"],
	])("words %s", (_kind, option, line) => {
		expect(optionKindLine(option, sources, t)).toBe(line);
	});
});

describe("optionSentences", () => {
	/** An option's sentences read (in English unless told) with each person's id for a name, as the card reads them. */
	const said = (
		option: Parameters<typeof optionSentences>[0],
		wordSources: OptionWordSources = sources,
		translate: TFunction = t
	): Array<string> | undefined =>
		optionSentences(option, wordSources, translate)?.map((sentence) =>
			translate(sentence.key, {
				...sentence.values,
				name: sentence.membershipId,
			})
		);

	it.each([
		[
			"a call-in on a day off",
			callInOption(),
			["<name>m-1</name> comes in on a day off"],
		],
		[
			"a call-in on a rest day",
			restDayCallInOption(),
			["<name>m-1</name> comes in on a rest day"],
		],
		[
			"a move",
			moveOption(),
			["<name>m-2</name> moves from Lunch Rush 11:00 – 13:00"],
		],
		[
			"a stretch after",
			stretchAfterOption(),
			["<name>m-2</name> stays on 2 h, until 15:00"],
		],
		[
			"a stretch before",
			stretchBeforeOption(),
			["<name>m-3</name> starts 2 h early, at 12:00"],
		],
		[
			"a stretch after a shift on another day",
			stretchAfterOtherDayOption(),
			["<name>m-2</name> stays on 2 h after Friday Lunch Rush, until 15:00"],
		],
		[
			"a stretch before a shift on another day",
			stretchBeforeOtherDayOption(),
			["<name>m-3</name> starts Sunday Swing Shift 2 h early, at 12:00"],
		],
		[
			"a pair of stretches, the one who stays on first",
			stretchPairOption(),
			[
				"<name>m-2</name> stays on 2 h, until 15:00",
				"<name>m-3</name> starts 2 h early, at 12:00",
			],
		],
		[
			"a day swap",
			daySwapOption(),
			["<name>m-1</name> works this shift instead of Friday Front Desk AM"],
		],
		["the older repair's two changes", otherTwoPeopleOption(), undefined],
	])("says %s", (_kind, option, sentences) => {
		expect(said(option)).toEqual(sentences);
	});

	it("puts the one who stays on first even when the engine lists them second", () => {
		const pair = stretchPairOption();

		expect(said({ ...pair, cells: [...pair.cells].reverse() })).toEqual([
			"<name>m-2</name> stays on 2 h, until 15:00",
			"<name>m-3</name> starts 2 h early, at 12:00",
		]);
	});

	it("says a call-in on a day type of the company's own by its name", () => {
		const onHoliday: OptionWordSources = {
			...sources,
			dayBefore: () => ({
				kind: "OFF",
				dayType: "PUBLIC_HOLIDAY_OFF",
				shift: null,
				jobTitle: null,
				stretch: null,
			}),
		};

		expect(said(callInOption(), onHoliday)).toEqual([
			"<name>m-1</name> comes in on a public holiday off",
		]);
	});

	it.each([
		[
			"a stretch of no minutes",
			{
				...stretchAfterOption(),
				cells: [{ ...stretchAfterOption().cells[0]!, stretchAfterMinutes: 0 }],
			},
		],
		[
			"a move from a shift the roster does not name",
			{
				...moveOption(),
				cells: [{ ...moveOption().cells[0]!, day: "2026-11-01" }],
			},
		],
		["an option with no day worked", { ...callInOption(), cells: [] }],
	])("cannot say %s, so the card draws it", (_case, option) => {
		expect(optionSentences(option, sources, t)).toBeUndefined();
	});

	it("says each kind in Spanish with the same values", () => {
		const spanishSources = { ...sources, weekday: (): string => "viernes" };

		expect(
			[
				callInOption(),
				moveOption(),
				stretchAfterOption(),
				stretchBeforeOption(),
				stretchAfterOtherDayOption(),
				stretchBeforeOtherDayOption(),
				daySwapOption(),
			].flatMap((option) => said(option, spanishSources, spanish))
		).toEqual([
			"<name>m-1</name> viene en su día libre",
			"<name>m-2</name> pasa desde Lunch Rush 11:00 – 13:00",
			"<name>m-2</name> se queda 2 h más, hasta las 15:00",
			"<name>m-3</name> empieza 2 h antes, a las 12:00",
			"<name>m-2</name> se queda 2 h más tras Lunch Rush del viernes, hasta las 15:00",
			"<name>m-3</name> empieza Swing Shift del viernes 2 h antes, a las 12:00",
			"<name>m-1</name> trabaja este turno en lugar de Front Desk AM del viernes",
		]);
	});
});

describe("costChips", () => {
	it.each([
		["nothing extra", callInOption(), ["Within hours"]],
		["a part-timer past their contract", moveOption(), ["+2 h extra hours"]],
		["overtime", stretchAfterOption(), ["+2 h overtime"]],
		[
			"a rest day worked and time off earned",
			restDayCallInOption(),
			["6 h on a rest day", "+6 h time off earned"],
		],
		[
			"an option not checked against the rules",
			callInOption({ workingTimeRulesChecked: false }),
			["Within hours", "Not rule-checked"],
		],
		["no figures from the engine", callInOption({ extraMinutes: null }), []],
	])("chips %s", (_case, option, chips) => {
		expect(costChips(option, t).map((chip) => chip.text)).toEqual(chips);
	});
});

describe("whatItLeaves", () => {
	const shortByTwo = [
		{ start: "2026-10-17T09:00:00", end: "2026-10-17T15:00:00", shortBy: 2 },
	];

	it("says nothing for an option that fills the gap, or one that does not say", () => {
		expect(whatItLeaves(callInOption(), shortByTwo, t)).toBeUndefined();
		expect(
			whatItLeaves(callInOption({ fills: null }), null, t)
		).toBeUndefined();
	});

	it("says one of how many the roster has short now, and nothing without that count", () => {
		expect(whatItLeaves(oneOfTwoOption(), shortByTwo, t)).toEqual({
			kind: "onePerson",
			text: "Fills 1 of 2",
		});
		expect(whatItLeaves(oneOfTwoOption(), null, t)).toBeUndefined();
		expect(whatItLeaves(oneOfTwoOption(), [], t)).toBeUndefined();
	});

	it("names every span a part fill leaves short", () => {
		expect(
			whatItLeaves(
				{
					fills: "PART",
					stillShort: [
						{
							start: "2026-10-17T09:00:00",
							end: "2026-10-17T11:00:00",
							shortBy: 1,
						},
						{
							start: "2026-10-17T14:00:00",
							end: "2026-10-17T15:00:00",
							shortBy: 1,
						},
					],
				},
				null,
				t
			)
		).toEqual({
			kind: "part",
			text: "Still short 09:00 – 11:00, 14:00 – 15:00",
		});
	});
});

describe("weekLine and stillShortToast", () => {
	it("words a week before and after in hours", () => {
		expect(weekLine({ before: 1800, after: 2160, contract: 2640 }, t)).toBe(
			"30 → 36 h of 44 h this week"
		);
	});

	it("words a week the option leaves as it was without an arrow", () => {
		expect(weekLine({ before: 1800, after: 1800, contract: 2640 }, t)).toBe(
			"30 h of 44 h this week"
		);
	});

	it("says what a part fill still leaves short, and nothing for a full one", () => {
		expect(stillShortToast(stretchAfterOption(), "Front Desk AM", t)).toBe(
			"Roster changed. Front Desk AM is still 1 short 09:00 – 11:00."
		);
		expect(stillShortToast(callInOption(), "Front Desk AM", t)).toBeUndefined();
	});
});

describe("REFUSAL_ACTIONS", () => {
	it("offers Try again where asking again may help, Find options again after the roster moved, else nothing", () => {
		expect(REFUSAL_ACTIONS).toEqual({
			tooSlow: "tryAgain",
			failed: "tryAgain",
			notConnected: "tryAgain",
			rosterMoved: "findAgain",
			expired: undefined,
			notSeenByEngine: undefined,
		});
	});
});

describe("optionKindLine: edges", () => {
	it("reads a day swap from its WORK cell whatever the order of its cells", () => {
		const swap = daySwapOption();
		expect(
			optionKindLine({ ...swap, cells: [...swap.cells].reverse() }, sources, t)
		).toBe("Works Saturday instead of Friday");
	});

	it("reads a stretch with no minutes, or no cells, as any other change", () => {
		const stretch = stretchAfterOption();
		expect(
			optionKindLine(
				{
					...stretch,
					cells: [
						{
							membershipId: "m-2",
							day: "2026-10-17",
							kind: "WORK",
							shiftId: "lunch-rush-copy",
						},
					],
				},
				sources,
				t
			)
		).toBe("1 change");
		expect(optionKindLine({ ...stretch, cells: [] }, sources, t)).toBe(
			"0 changes"
		);
	});
});

describe("stillShortToast: counts by span", () => {
	it("gives each span its own count when they differ", () => {
		expect(
			stillShortToast(
				{
					stillShort: [
						{
							start: "2026-10-17T22:00:00",
							end: "2026-10-18T02:00:00",
							shortBy: 1,
						},
						{
							start: "2026-10-18T02:00:00",
							end: "2026-10-18T04:00:00",
							shortBy: 2,
						},
					],
				},
				"Overnight Ops",
				t
			)
		).toBe(
			"Roster changed. Overnight Ops is still 1 short 22:00 – 02:00, 2 short 02:00 – 04:00."
		);
	});
});
