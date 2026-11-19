import { describe, expect, it } from "vitest";
import type { CoverListView } from "@/features/scheduling/cover/coverListView";
import { coverWithEngine } from "@/features/scheduling/cover/coverWithEngine";
import {
	callInMove,
	feasibleRepair,
	infeasibleRepair,
	partStretchRepair,
	stretchMove,
} from "@/features/scheduling/cover/engineRepairFixtures";
import {
	coverOptionFixture,
	coverOptionsFixture,
} from "@/features/scheduling/cover/fixtures";
import {
	coverCards,
	engineOvertimeMinutes,
	weekHoursOf,
	type CoverCardSources,
} from "@/features/scheduling/roster/coverCards";

const NAMES: Record<string, string> = {
	"m-1": "Aisha Rahman",
	"m-2": "Ben Ong",
	"m-3": "Chen Wei",
};

/** The cards for `view`, the engine's `options` and the backend's own list (nothing merged). */
const cardsOf = (
	view: CoverListView,
	overrides: Partial<CoverCardSources> = {}
): ReturnType<typeof coverCards> =>
	coverCards({
		view,
		engineOptions: [
			infeasibleRepair(),
			feasibleRepair([callInMove()]),
			feasibleRepair([stretchMove()]),
			partStretchRepair(),
		],
		backend: coverWithEngine(coverOptionsFixture(), undefined, () => undefined),
		memberName: (membershipId) => NAMES[membershipId] ?? "",
		pairsOf: (cells) =>
			cells.map((cell) => ({
				key: cell.day,
				before: { kind: "day", label: "Day off" },
				after: { kind: "day", label: cell.kind },
			})),
		...overrides,
	});

describe("coverCards", () => {
	it("given_theEnginesList_when_carded_then_feasibleOnesEachWithItsBadgeAndTheFirstSuggested", () => {
		const cards = cardsOf("engine");

		expect(
			cards.map((card) => [card.name, card.badge.kind, card.suggested])
		).toEqual([
			["Aisha Rahman", "withinHours", true],
			["Chen Wei", "overtime", false],
			["Chen Wei", "leavesShort", false],
		]);
		expect(cards[0]?.pairs).toHaveLength(1);
		expect(cards[2]?.badge).toEqual({ kind: "leavesShort", count: 1 });
	});

	it.each<CoverListView>(["backendFallback", "backendWithEngine"])(
		"given_the %s view_when_carded_then_theBackendsPeopleNotRuleCheckedTheFirstSuggested",
		(view) => {
			const cards = cardsOf(view);

			expect(
				cards.map((card) => [card.name, card.badge.kind, card.suggested])
			).toEqual([
				["Aisha Rahman", "notRuleChecked", true],
				["Chen Wei", "notRuleChecked", false],
			]);
		}
	);

	it("given_theEngineVouchingForSomeone_when_carded_then_theyAreSuggestedWithTheirHours", () => {
		const backend = {
			...coverWithEngine(coverOptionsFixture(), undefined, () => undefined),
			suggested: "m-3",
			engineNote: { "m-3": "fills" as const },
		};

		const cards = cardsOf("backendWithEngine", { backend });

		expect(cards.find((card) => card.suggested)?.name).toBe("Chen Wei");
		expect(cards.find((card) => card.name === "Chen Wei")?.badge.kind).toBe(
			"overtime"
		);
	});

	it("given_theGapsOwnState_when_carded_then_noCards", () => {
		expect(cardsOf("gapStatus")).toEqual([]);
	});
});

describe("weekHoursOf and engineOvertimeMinutes", () => {
	it.each([
		[{ before: 1440, after: 1800, contract: 2640 }, 0, 1800 / 26.4],
		[{ before: 2400, after: 2880, contract: 2640 }, 240, 100],
	])("reads the week %o as %s minutes over, %s percent full", (week, overtime, percent) => {
		const hours = weekHoursOf(coverOptionFixture({ weekMinutes: week }));
		expect(hours.overtimeMinutes).toBe(overtime);
		expect(hours.percent).toBeCloseTo(percent);
	});

	it("counts an option's own overtime, else its stretches", () => {
		expect(engineOvertimeMinutes(feasibleRepair([stretchMove()]))).toBe(120);
		expect(
			engineOvertimeMinutes(
				feasibleRepair([stretchMove()], {
					extraMinutes: { overtime: 90, restDayWork: 0, timeOffEarned: 0 },
				})
			)
		).toBe(90);
		expect(engineOvertimeMinutes(feasibleRepair([callInMove()]))).toBe(0);
	});
});
