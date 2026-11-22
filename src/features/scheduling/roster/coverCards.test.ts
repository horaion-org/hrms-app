import { describe, expect, it } from "vitest";
import { authTestI18n } from "@/features/auth/testingI18n";
import {
	callInOption,
	daySwapOption,
	moveOption,
	oneOfTwoOption,
	otherTwoPeopleOption,
	restDayCallInOption,
	restDayMoveOption,
	stretchAfterOption,
	stretchBeforeOption,
	stretchPairOption,
	takenOffCallInOption,
} from "@/features/scheduling/cover/engineRepairFixtures";
import type { RepairOption } from "@/features/scheduling/cover/engineRepairApi";
import {
	coverOptionFixture,
	coverOptionsFixture,
} from "@/features/scheduling/cover/fixtures";
import { coverOfferFixture } from "@/features/scheduling/coverOffers/fixtures";
import {
	fallbackCards,
	optionCardList,
	reviewedCardOf,
	reviewPeopleOf,
	weekHoursOf,
	type OptionCard,
	type OptionCardSources,
} from "@/features/scheduling/roster/coverCards";
import { assignmentCell } from "@/features/scheduling/rosterChanges/cellText";
import type { RosterCellValue } from "@/features/scheduling/schedules/api";
import { scheduleAssignmentsFixture } from "@/features/scheduling/schedules/fixtures";

const NAMES: Record<string, string> = {
	"m-1": "Aisha Rahman",
	"m-2": "Ben Ong",
	"m-3": "Chen Wei",
};

/** What a card says its change is, as words: each sentence with its person's name, or the count of a drawn change. */
const said = (card: OptionCard): Array<string> =>
	card.change.kind === "sentences"
		? card.change.sentences.map((sentence) =>
				authTestI18n.t(sentence.key, {
					...sentence.values,
					name: sentence.name,
				})
			)
		: [card.change.changeCount];

describe("weekHoursOf", () => {
	it.each([
		[{ before: 1440, after: 1800, contract: 2640 }, 0, 1800 / 26.4],
		[{ before: 2400, after: 2880, contract: 2640 }, 240, 100],
	])(
		"reads the week %o as %s minutes over, %s percent full",
		(week, overtime, percent) => {
			const hours = weekHoursOf(week);
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
		dayBefore: (cell): RosterCellValue | undefined => {
			const row = roster.find(
				(candidate) =>
					candidate.member?.membershipId === cell.membershipId &&
					candidate.day === cell.day
			);
			return row && assignmentCell(row);
		},
		weekday: (isoDate) => (isoDate === "2026-10-17" ? "Saturday" : "Friday"),
		gapDay: "2026-10-17",
		memberName: (membershipId) => NAMES[membershipId] ?? "",
		groupsOf: (cells, nameOf) =>
			cells.map((cell) => ({
				membershipId: cell.membershipId,
				name: nameOf(cell.membershipId),
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
				["<name>Aisha Rahman</name> comes in on a day off"],
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
				["<name>Aisha Rahman</name> comes in on a rest day"],
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
				["<name>Ben Ong</name> moves from Lunch Rush 11:00 – 13:00"],
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
				["<name>Ben Ong</name> stays on 2 h, until 15:00"],
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
				[
					"<name>Ben Ong</name> stays on 2 h, until 15:00",
					"<name>Chen Wei</name> starts 2 h early, at 12:00",
				],
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
				[
					"<name>Aisha Rahman</name> works this shift instead of Friday Front Desk AM",
				],
				["Within hours"],
				"30 h of 44 h this week",
				undefined,
			],
		],
		[
			"a rest-day move",
			restDayMoveOption(),
			[
				"Aisha Rahman",
				[
					"<name>Aisha Rahman</name> comes in on a rest day; Saturday becomes their rest day",
				],
				["Within hours"],
				"30 → 36 h of 44 h this week",
				undefined,
			],
		],
		[
			"the older repair's two changes",
			otherTwoPeopleOption(),
			[
				"Ben Ong and Aisha Rahman",
				["2 changes"],
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
				["<name>Aisha Rahman</name> comes in on a day off"],
				["Within hours"],
				"30 → 36 h of 44 h this week",
				"Fills 1 of 2",
			],
		],
	])("cards %s", (_case, option, [people, change, chips, week, leaves]) => {
		const [card] = optionCardList([option], sources()).cards;

		expect(card).toMatchObject({ people, weekLine: week });
		expect(card && said(card)).toEqual(change);
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
		expect(list).toMatchObject({ partCaptionAt: 2, noFullFill: false });
	});

	it("never suggests an option not checked against the rules, nor the one after it", () => {
		const list = optionCardList(
			[callInOption({ workingTimeRulesChecked: false }), moveOption()],
			sources()
		);

		expect(list.cards.map((card) => card.suggested)).toEqual([false, false]);
	});

	it("marks someone taken off the shift earlier and never suggests them", () => {
		const list = optionCardList(
			[takenOffCallInOption(), moveOption()],
			sources()
		);

		expect(list.cards.map((card) => card.takenOffEarlier)).toEqual([
			"Taken off this shift earlier",
			undefined,
		]);
		expect(list.cards.map((card) => card.suggested)).toEqual([false, false]);
	});

	it.each<[string, Array<RepairOption>, Array<string>, number | undefined]>([
		[
			"full fills, then a part fill",
			[callInOption(), moveOption(), daySwapOption(), stretchAfterOption()],
			["CALL_IN", "MOVE", "DAY_SWAP", "OVERTIME_STRETCH"],
			3,
		],
		[
			"a full fill sent after a part fill (someone taken off the shift, ranked last)",
			[stretchAfterOption(), takenOffCallInOption()],
			["CALL_IN", "OVERTIME_STRETCH"],
			1,
		],
		[
			"part fills only",
			[stretchAfterOption(), stretchBeforeOption()],
			["OVERTIME_STRETCH", "OVERTIME_STRETCH"],
			undefined,
		],
	])(
		"heads only part fills with the caption: %s",
		(_case, options, kinds, captionAt) => {
			const list = optionCardList(options, sources());

			expect(
				list.cards.map((card) =>
					card.choice.kind === "engine" ? card.choice.option.kind : ""
				)
			).toEqual(kinds);
			expect(list.partCaptionAt).toBe(captionAt);
		}
	);

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

	it("reads the newest offer of the card's shift and day, the offers coming newest first", () => {
		const declinedThenSent = [
			coverOfferFixture({ offerId: "o-2", expiresAt: "2099-01-01T00:00:00Z" }),
			coverOfferFixture({
				offerId: "o-1",
				status: "DECLINED",
				answeredAt: "2026-10-16T04:00:00Z",
			}),
		];
		const withdrawnThenDeclined = [
			coverOfferFixture({
				offerId: "o-2",
				status: "DECLINED",
				answeredAt: "2026-10-16T06:00:00Z",
			}),
			coverOfferFixture({ offerId: "o-1", status: "WITHDRAWN" }),
		];

		expect(
			optionCardList([callInOption()], sources({ offers: declinedThenSent }))
				.cards[0]?.offer
		).toEqual({ kind: "open", until: "2099-01-01T00:00:00Z" });
		expect(
			optionCardList(
				[callInOption()],
				sources({ offers: withdrawnThenDeclined })
			).cards[0]
		).toMatchObject({ offer: { kind: "declined" }, suggested: false });
	});

	it("takes no decline of another shift that day for a decline of this one", () => {
		const otherShift = coverOfferFixture({
			status: "DECLINED",
			answeredAt: "2026-10-16T06:00:00Z",
			shift: { ...coverOfferFixture().shift!, shiftId: "lunch-rush-copy" },
		});

		expect(
			optionCardList([callInOption()], sources({ offers: [otherShift] }))
				.cards[0]
		).toMatchObject({ offer: { kind: "none" }, suggested: true });
	});

	it("never suggests a person of the hours-based list who declined, as among the engine's options", () => {
		const cards = fallbackCards(
			coverOptionsFixture().options,
			sources({
				offers: [
					coverOfferFixture({
						status: "DECLINED",
						answeredAt: "2026-10-16T06:00:00Z",
					}),
				],
			})
		);

		expect(cards[0]).toMatchObject({
			offer: { kind: "declined" },
			suggested: false,
		});
	});

	// The hours-based list never holds someone whose day already has a shift (the API lists them as
	// ALREADY_WORKING), so each of its people comes in: a call-in sentence, never a drawn change.
	it("cards the hours-based people as call-ins with their cost, not rule-checked, their week, none suggested", () => {
		const cards = fallbackCards(coverOptionsFixture().options, sources());

		expect(
			cards.map((card) => [
				card.people,
				said(card),
				card.costChips.map((chip) => chip.text),
				card.suggested,
			])
		).toEqual([
			[
				"Aisha Rahman",
				["<name>Aisha Rahman</name> comes in on a day off"],
				["Within hours", "Not rule-checked"],
				false,
			],
			[
				"Chen Wei",
				["<name>Chen Wei</name> comes in on a rest day"],
				["+6 h overtime", "Not rule-checked"],
				false,
			],
		]);
		expect(cards[0]?.weekLine).toBe("24 → 30 h of 44 h this week");
	});
});

describe("reviewPeopleOf", () => {
	it("gives each person an option changes, with their week, and the hours-based person with theirs", () => {
		expect(
			reviewPeopleOf({ kind: "engine", option: stretchPairOption() }, () => "")
		).toEqual([
			{
				membershipId: "m-2",
				name: "Ben Ong",
				weekMinutes: {
					before: 1200,
					after: 1320,
					contract: 1320,
					countedLeave: 0,
				},
			},
			{
				membershipId: "m-3",
				name: "Chen Wei",
				weekMinutes: {
					before: 2880,
					after: 3000,
					contract: 2640,
					countedLeave: 0,
				},
			},
		]);
		expect(
			reviewPeopleOf(
				{ kind: "backend", option: coverOptionFixture() },
				(membershipId) => NAMES[membershipId] ?? ""
			)
		).toEqual([
			{
				membershipId: "m-1",
				name: "Aisha Rahman",
				weekMinutes: { before: 1440, after: 1800, contract: 2640 },
			},
		]);
	});
});

describe("reviewedCardOf", () => {
	it("finds the card of the chosen change wherever the answer ranks it now, and none once it is gone", () => {
		const roster = scheduleAssignmentsFixture();
		const sources: OptionCardSources = {
			dayBefore: (cell): RosterCellValue | undefined => {
				const row = roster.find(
					(candidate) =>
						candidate.member?.membershipId === cell.membershipId &&
						candidate.day === cell.day
				);
				return row && assignmentCell(row);
			},
			weekday: () => "Saturday",
			gapDay: "2026-10-17",
			memberName: (membershipId) => NAMES[membershipId] ?? "",
			groupsOf: () => [],
			shortNow: null,
			offers: [],
			now: new Date("2026-10-16T05:00:00Z"),
			t: authTestI18n.t,
		};
		const chosen = moveOption();
		const reordered = optionCardList(
			[callInOption(), moveOption()],
			sources
		).cards;

		expect(
			reviewedCardOf(reordered, { option: chosen, membershipId: undefined })
				?.people
		).toBe("Ben Ong");
		expect(
			reviewedCardOf(optionCardList([callInOption()], sources).cards, {
				option: chosen,
				membershipId: undefined,
			})
		).toBeUndefined();
	});
});

describe("optionCardList: someone the roster no longer shows", () => {
	it("names them once, as the answer does, in the card's head and over their tiles", () => {
		const gone = callInOption({
			cells: [
				{
					membershipId: "m-9",
					day: "2026-10-17",
					kind: "WORK",
					shiftId: "front-desk-am-copy",
				},
			],
			people: [
				{
					membershipId: "m-9",
					displayName: "Gone Person",
					weekMinutes: null,
					takenOffThisShift: false,
				},
			],
		});
		const [card] = optionCardList([gone], {
			dayBefore: () => undefined,
			weekday: () => "Saturday",
			gapDay: "2026-10-17",
			memberName: () => "Former member",
			groupsOf: (cells, nameOf) =>
				cells.map((cell) => ({
					membershipId: cell.membershipId,
					name: nameOf(cell.membershipId),
					days: [],
				})),
			shortNow: null,
			offers: [],
			now: new Date("2026-10-16T05:00:00Z"),
			t: authTestI18n.t,
		}).cards;

		expect(card?.people).toBe("Gone Person");
		expect(card?.groups[0]?.name).toBe("Gone Person");
	});
});
