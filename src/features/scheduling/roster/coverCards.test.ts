import { describe, expect, it } from "vitest";
import { authTestI18n } from "@/features/auth/testingI18n";
import {
	callInOption,
	daySwapOption,
	moveOption,
	oneOfTwoOption,
	otherTwoPeopleOption,
	restDayCallInOption,
	stretchAfterOption,
	stretchBeforeOption,
	stretchPairOption,
} from "@/features/scheduling/cover/engineRepairFixtures";
import {
	coverOptionFixture,
	coverOptionsFixture,
} from "@/features/scheduling/cover/fixtures";
import { coverOfferFixture } from "@/features/scheduling/coverOffers/fixtures";
import {
	fallbackCards,
	optionCardList,
	weekHoursOf,
	type OptionCardSources,
} from "@/features/scheduling/roster/coverCards";
import { assignmentCell } from "@/features/scheduling/rosterChanges/cellText";
import { scheduleAssignmentsFixture } from "@/features/scheduling/schedules/fixtures";

const NAMES: Record<string, string> = {
	"m-1": "Aisha Rahman",
	"m-2": "Ben Ong",
	"m-3": "Chen Wei",
};

describe("weekHoursOf", () => {
	it.each([
		[{ before: 1440, after: 1800, contract: 2640 }, 0, 1800 / 26.4],
		[{ before: 2400, after: 2880, contract: 2640 }, 240, 100],
	])(
		"reads the week %o as %s minutes over, %s percent full",
		(week, overtime, percent) => {
			const hours = weekHoursOf(coverOptionFixture({ weekMinutes: week }));
			expect(hours.overtimeMinutes).toBe(overtime);
			expect(hours.percent).toBeCloseTo(percent);
		}
	);
});

describe("optionCardList", () => {
	const roster = scheduleAssignmentsFixture();
	const SHORT_BY_TWO = [
		{ start: "2026-10-17T09:00:00", end: "2026-10-17T15:00:00", shortBy: 2 },
	];
	const sources = (
		overrides: Partial<OptionCardSources> = {}
	): OptionCardSources => ({
		dayBefore: (cell) => {
			const row = roster.find(
				(candidate) =>
					candidate.member?.membershipId === cell.membershipId &&
					candidate.day === cell.day
			);
			return row && assignmentCell(row);
		},
		weekday: (isoDate) => (isoDate === "2026-10-17" ? "Saturday" : "Friday"),
		memberName: (membershipId) => NAMES[membershipId] ?? "",
		groupsOf: (cells) =>
			cells.map((cell) => ({
				membershipId: cell.membershipId,
				name: "",
				days: [],
			})),
		shortNow: SHORT_BY_TWO,
		offers: [],
		now: new Date("2026-10-16T05:00:00Z"),
		t: authTestI18n.t,
		...overrides,
	});

	it.each([
		[
			"a call-in on a day off",
			callInOption(),
			[
				"Aisha Rahman",
				"Comes in on a day off",
				["Within hours"],
				"30 → 36 h of 44 h this week",
				undefined,
			],
		],
		[
			"a call-in on a rest day",
			restDayCallInOption(),
			[
				"Aisha Rahman",
				"Comes in on a rest day",
				["6 h on a rest day", "+6 h time off earned"],
				"30 → 36 h of 44 h this week",
				undefined,
			],
		],
		[
			"a move",
			moveOption(),
			[
				"Ben Ong",
				"Moves from Lunch Rush",
				["+2 h extra hours"],
				"20 → 24 h of 22 h this week",
				undefined,
			],
		],
		[
			"a stretch that fills part",
			stretchAfterOption(),
			[
				"Ben Ong",
				"Stays on 2 h",
				["+2 h overtime"],
				"20 → 22 h of 22 h this week",
				"Still short 09:00 – 11:00",
			],
		],
		[
			"a stretch pair",
			stretchPairOption(),
			[
				"Ben Ong and Chen Wei",
				"Cover it between them",
				["+4 h overtime"],
				undefined,
				undefined,
			],
		],
		[
			"a day swap",
			daySwapOption(),
			[
				"Aisha Rahman",
				"Works Saturday instead of Friday",
				["Within hours"],
				"30 → 30 h of 44 h this week",
				undefined,
			],
		],
		[
			"the older repair's two changes",
			otherTwoPeopleOption(),
			[
				"Ben Ong and Aisha Rahman",
				"2 changes",
				["+2 h extra hours"],
				undefined,
				undefined,
			],
		],
		[
			"one person of two",
			oneOfTwoOption(),
			[
				"Aisha Rahman",
				"Comes in on a day off",
				["Within hours"],
				"30 → 36 h of 44 h this week",
				"Fills 1 of 2",
			],
		],
	])("cards %s", (_case, option, [people, kindLine, chips, week, leaves]) => {
		const [card] = optionCardList([option], sources()).cards;

		expect(card).toMatchObject({ people, kindLine, weekLine: week });
		expect(card?.costChips.map((chip) => chip.text)).toEqual(chips);
		expect(card?.leaves?.text).toBe(leaves);
		expect(card?.groups.map((group) => group.membershipId)).toEqual(
			option.cells.map((cell) => cell.membershipId)
		);
	});

	it("suggests the first card only when it fills more than part, and puts the caption before the first part fill", () => {
		const list = optionCardList(
			[
				callInOption(),
				moveOption(),
				stretchAfterOption(),
				stretchBeforeOption(),
			],
			sources()
		);

		expect(list.cards.map((card) => card.suggested)).toEqual([
			true,
			false,
			false,
			false,
		]);
		expect(list).toMatchObject({
			partCaptionAt: 2,
			noFullFill: false,
			collapsedCount: 4,
		});
	});

	it("folds after three cards when the caption falls past them", () => {
		const list = optionCardList(
			[callInOption(), moveOption(), daySwapOption(), stretchAfterOption()],
			sources()
		);

		expect(list).toMatchObject({ partCaptionAt: 3, collapsedCount: 3 });
	});

	it("suggests nothing and needs no caption when every option fills only part", () => {
		const list = optionCardList(
			[stretchAfterOption(), stretchBeforeOption()],
			sources()
		);

		expect(list.cards.some((card) => card.suggested)).toBe(false);
		expect(list).toMatchObject({ partCaptionAt: undefined, noFullFill: true });
	});

	it("shows an offer out on its person's card, and never suggests someone who declined", () => {
		const open = optionCardList(
			[callInOption()],
			sources({
				offers: [coverOfferFixture({ expiresAt: "2099-01-01T00:00:00Z" })],
			})
		).cards[0];
		const declined = optionCardList(
			[callInOption(), moveOption()],
			sources({
				offers: [
					coverOfferFixture({
						status: "DECLINED",
						answeredAt: "2026-10-16T06:00:00Z",
					}),
				],
			})
		).cards;

		expect(open?.offer).toEqual({
			kind: "open",
			until: "2099-01-01T00:00:00Z",
		});
		expect(declined[0]).toMatchObject({
			offer: { kind: "declined" },
			suggested: false,
		});
	});

	it("cards the hours-based people with their cost, not rule-checked, their week, the first suggested", () => {
		const cards = fallbackCards(coverOptionsFixture().options, sources());

		expect(
			cards.map((card) => [
				card.people,
				card.kindLine,
				card.costChips.map((chip) => chip.text),
				card.suggested,
			])
		).toEqual([
			[
				"Aisha Rahman",
				"Comes in on a day off",
				["Within hours", "Not rule-checked"],
				true,
			],
			[
				"Chen Wei",
				"Comes in on a rest day",
				["+6 h overtime", "Not rule-checked"],
				false,
			],
		]);
		expect(cards[0]?.weekLine).toBe("24 → 30 h of 44 h this week");
	});
});
