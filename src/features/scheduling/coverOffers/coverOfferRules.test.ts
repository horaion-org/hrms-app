import { describe, expect, it } from "vitest";
import type { CoverOffer } from "@/features/scheduling/coverOffers/api";
import {
	cardOffers,
	consentKindOf,
	formatOfferTime,
	latestTimeStep,
	offeredDeadlines,
	offerStanding,
	offersOutGroups,
	openOfferOf,
	parallelToOf,
	payWordsOf,
	recordedInstant,
	rivalOffers,
} from "@/features/scheduling/coverOffers/coverOfferRules";
import {
	BEFORE_DEADLINE,
	coverOfferFixture,
} from "@/features/scheduling/coverOffers/fixtures";
import type { RosterEditChoice } from "@/features/scheduling/rosterChanges/rosterEdit";
import type { ScheduleAssignment } from "@/features/scheduling/schedules/api";

const offer = coverOfferFixture;
const shift = offer().shift!;
const working = { shift, offReason: null } as const;
const dayOff = { shift: null, offReason: "OFF" } as const;
const onLeave = { shift: null, offReason: "LEAVE" } as const;
const anotherShift: RosterEditChoice = { kind: "shift", shiftId: "x" };
const AFTER_DEADLINE = new Date("2026-10-16T07:31:00Z");

describe("consentKindOf", () => {
	it.each([
		["a draft roster", false, working, anotherShift, false, undefined],
		[
			"another shift on a working day",
			true,
			working,
			anotherShift,
			false,
			"MOVE",
		],
		[
			"a shift on a day off",
			true,
			dayOff,
			anotherShift,
			false,
			"OFF_DAY_SHIFT",
		],
		["a day off", true, working, { kind: "dayOff" }, false, undefined],
		[
			"the roster half of a leave move",
			true,
			onLeave,
			anotherShift,
			true,
			undefined,
		],
		["a leave day", true, onLeave, anotherShift, false, undefined],
		["no choice yet", true, working, undefined, false, undefined],
	] as const)(
		"given_%s_when_read_then_%s",
		(_, published, assignment, choice, leaveMove, kind) => {
			expect(
				consentKindOf({
					published,
					assignment,
					choice: choice,
					leaveMove,
				})
			).toBe(kind);
		}
	);
});

describe("openOfferOf and rivalOffers", () => {
	const offers: Array<CoverOffer> = [
		offer(),
		offer({
			offerId: "o-2",
			member: {
				...offer().member!,
				membershipId: "m-2",
				displayName: "Ben Ong",
			},
		}),
		offer({ offerId: "o-3", status: "DECLINED" }),
	];

	it("given_anOpenOfferForTheDay_when_read_then_findsIt", () => {
		expect(openOfferOf(offers, "m-1", "2026-10-17")?.offerId).toBe("o-1");
		expect(openOfferOf(offers, "m-1", "2026-10-18")).toBeUndefined();
		expect(openOfferOf(offers, null, "2026-10-17")).toBeUndefined();
	});

	it("given_otherMembersOffersForTheGap_when_read_then_listsOnlyTheirOpenOnes", () => {
		expect(
			rivalOffers(offers, {
				day: "2026-10-17",
				shiftId: shift.shiftId,
				membershipId: "m-1",
			}).map((row) => row.offerId)
		).toEqual(["o-2"]);
	});
});

describe("parallelToOf", () => {
	const rival = (
		offerId: string,
		groupId: string,
		kind = "OFF_DAY_SHIFT"
	): CoverOffer =>
		offer({ offerId, groupId, optionKind: kind as CoverOffer["optionKind"] });

	it.each([
		["no rivals", [], undefined],
		["a rival of the same kind", [rival("o-2", "g-1")], "o-2"],
		["only a rival of another kind", [rival("o-2", "g-1", "MOVE")], undefined],
		[
			"a full group and a roomy one",
			[
				rival("o-2", "g-1"),
				rival("o-3", "g-1"),
				rival("o-4", "g-1"),
				rival("o-5", "g-2"),
			],
			"o-5",
		],
	] as const)("given_%s_when_read_then_%s", (_, rivals, expected) => {
		expect(parallelToOf(rivals, "OFF_DAY_SHIFT")).toBe(expected);
	});
});

describe("payWordsOf", () => {
	it.each([
		["MOVE", { key: "sameHours" }],
		["STRETCH", { key: "longer" }],
		["OFF_DAY_SHIFT", { key: "overtime", hours: 6 }],
		["REST_DAY_SHIFT", { key: "restDay" }],
		["UNKNOWN", { key: "unknown" }],
	] as const)("given_%s_when_read_then_%o", (optionKind, words) => {
		expect(payWordsOf(offer({ optionKind }))).toEqual(words);
	});
});

describe("offerStanding", () => {
	it.each([
		[
			"open before its deadline",
			offer(),
			BEFORE_DEADLINE,
			{ kind: "open", until: "2026-10-16T07:30:00Z" },
		],
		[
			"open past its deadline",
			offer(),
			AFTER_DEADLINE,
			{ kind: "expired", at: "2026-10-16T07:30:00Z" },
		],
		[
			"applied",
			offer({ status: "APPLIED", answeredAt: "t" }),
			BEFORE_DEADLINE,
			{ kind: "accepted", at: "t" },
		],
		[
			"declined",
			offer({ status: "DECLINED", answeredAt: "t" }),
			BEFORE_DEADLINE,
			{ kind: "declined", at: "t" },
		],
		[
			"expired",
			offer({ status: "EXPIRED" }),
			BEFORE_DEADLINE,
			{ kind: "expired", at: "2026-10-16T07:30:00Z" },
		],
		[
			"withdrawn",
			offer({ status: "WITHDRAWN" }),
			BEFORE_DEADLINE,
			{ kind: "withdrawn" },
		],
		[
			"unknown",
			offer({ status: "UNKNOWN" }),
			BEFORE_DEADLINE,
			{ kind: "unavailable" },
		],
	] as const)("given_%s_when_read_then_saysSo", (_, row, now, standing) => {
		expect(offerStanding(row, now)).toEqual(standing);
	});
});

describe("cardOffers", () => {
	const offers = [
		offer({ offerId: "o-2", rosterDate: "2026-10-18" }),
		offer(),
		offer({ offerId: "o-3", status: "DECLINED" }),
		offer({ offerId: "o-4", scheduleId: "s-2" }),
	];

	it("given_noLink_when_read_then_showsThisRostersOpenOffersByDay", () => {
		expect(
			cardOffers(offers, "s-1", undefined, BEFORE_DEADLINE).offers.map(
				(row) => row.offerId
			)
		).toEqual(["o-1", "o-2"]);
	});

	it("given_aLinkToAClosedOffer_when_read_then_showsItToo", () => {
		expect(
			cardOffers(offers, "s-1", "o-3", BEFORE_DEADLINE).offers.map(
				(row) => row.offerId
			)
		).toEqual(["o-1", "o-3", "o-2"]);
	});

	it("given_aLinkToNoOffer_when_read_then_saysItIsMissing", () => {
		expect(
			cardOffers(offers, "s-1", "o-9", BEFORE_DEADLINE).linkedMissing
		).toBe(true);
	});
});

describe("offersOutGroups", () => {
	const gap: Array<Pick<ScheduleAssignment, "day" | "uncoveredShift">> = [
		{ day: "2026-10-17", uncoveredShift: shift },
	];
	const ben = {
		...offer().member!,
		membershipId: "m-2",
		displayName: "Ben Ong",
	};

	it("given_aWaitingAndADeclinedOffer_when_read_then_groupsThemUnderTheGapWaitingFirst", () => {
		const groups = offersOutGroups(
			[
				offer({
					offerId: "o-2",
					member: ben,
					status: "DECLINED",
					answeredAt: "2026-10-16T06:12:00Z",
					answerReason: "Exam tomorrow",
				}),
				offer(),
			],
			gap,
			BEFORE_DEADLINE
		);

		expect(groups).toHaveLength(1);
		expect(groups[0]?.waiting).toBe(1);
		expect(groups[0]?.lines).toEqual([
			expect.objectContaining({
				offerId: "o-1",
				standing: "waiting",
				at: "2026-10-16T07:30:00Z",
			}),
			expect.objectContaining({
				offerId: "o-2",
				standing: "declined",
				at: "2026-10-16T06:12:00Z",
				reason: "Exam tomorrow",
			}),
		]);
	});

	it.each([
		[
			"a gap a yes filled",
			[offer({ status: "APPLIED" }), offer({ offerId: "o-2", member: ben })],
			gap,
			0,
		],
		["only withdrawn offers", [offer({ status: "WITHDRAWN" })], gap, 0],
		[
			"a decline while the gap is still short",
			[offer({ status: "DECLINED" })],
			gap,
			1,
		],
		[
			"a decline once the gap is no longer short",
			[offer({ status: "DECLINED" })],
			[],
			0,
		],
		["a waiting offer on a day not marked short", [offer()], [], 1],
	] as const)("given_%s_when_read_then_%i groups", (_, offers, gaps, count) => {
		expect(offersOutGroups(offers, gaps, BEFORE_DEADLINE)).toHaveLength(count);
	});
});

describe("recorded time", () => {
	// 13:18 in Singapore.
	const now = BEFORE_DEADLINE;

	it("given_now_when_read_then_defaultsToTheLatestHalfHour", () => {
		expect(latestTimeStep(now, "Asia/Singapore")).toBe("13:00");
	});

	it.each([
		["13:00", "2026-10-16T05:00:00.000Z"],
		["00:00", "2026-10-15T16:00:00.000Z"],
		["13:30", undefined],
	] as const)("given_%s_when_read_then_%s", (time, instant) => {
		expect(recordedInstant(now, "Asia/Singapore", time)).toBe(instant);
	});
});

describe("formatOfferTime", () => {
	it("given_aDeadlineToday_when_formatted_then_readsTheTimeOnly", () => {
		expect(
			formatOfferTime(
				"2026-10-16T07:30:00Z",
				"en-GB",
				"Asia/Singapore",
				BEFORE_DEADLINE
			)
		).toBe("15:30");
	});

	it("given_aDeadlineTomorrow_when_formatted_then_readsTheDayToo", () => {
		expect(
			formatOfferTime(
				"2026-10-17T07:30:00Z",
				"en-GB",
				"Asia/Singapore",
				BEFORE_DEADLINE
			)
		).toBe("Sat 17 Oct, 15:30");
	});
});

describe("offeredDeadlines", () => {
	it("given_openAndClosedOffers_when_read_then_mapsOnlyThisRostersOpenDaysToTheirDeadline", () => {
		expect(
			offeredDeadlines(
				[
					offer(),
					offer({
						offerId: "o-2",
						rosterDate: "2026-10-18",
						status: "DECLINED",
					}),
					offer({ offerId: "o-3", scheduleId: "s-2" }),
				],
				"s-1",
				BEFORE_DEADLINE
			)
		).toEqual(new Map([["m-1|2026-10-17", "2026-10-16T07:30:00Z"]]));
	});
});
