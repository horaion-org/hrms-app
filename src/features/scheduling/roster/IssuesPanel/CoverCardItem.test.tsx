import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it, vi } from "vitest";
import { authTestI18n } from "@/features/auth/testingI18n";
import type { RepairOption } from "@/features/scheduling/cover/engineRepairApi";
import {
	callInOption,
	daySwapOption,
	moveOption,
	oneOfTwoOption,
	otherTwoPeopleOption,
	restDayCallInOption,
	stretchAfterOption,
	stretchPairOption,
	takenOffCallInOption,
} from "@/features/scheduling/cover/engineRepairFixtures";
import type { CoverOffer } from "@/features/scheduling/coverOffers/api";
import { coverOfferFixture } from "@/features/scheduling/coverOffers/fixtures";
import { changeTileGroups } from "@/features/scheduling/roster/changeTiles";
import { optionCardList } from "@/features/scheduling/roster/coverCards";
import { assignmentCell } from "@/features/scheduling/rosterChanges/cellText";
import { scheduleAssignmentsFixture } from "@/features/scheduling/schedules/fixtures";
import { CoverCardItem } from "./CoverCardItem";

/*
 * One option's card, from the fixtures' answer for Front Desk AM on
 * Saturday 17 October, carded as the panel cards it.
 */

const roster = scheduleAssignmentsFixture();
const NOW = new Date("2026-10-16T05:00:00Z");
const t = authTestI18n.t;
const memberName = (membershipId: string): string =>
	roster.find((row) => row.member?.membershipId === membershipId)?.member
		?.displayName ?? "";

/** The first card of `options`, drawn, with `onReview` as its Review. */
const show = (
	options: Array<RepairOption>,
	offers: Array<CoverOffer> = [],
	onReview = vi.fn()
): HTMLElement => {
	const [card] = optionCardList(options, {
		dayBefore: (cell) => {
			const row = roster.find(
				(candidate) =>
					candidate.member?.membershipId === cell.membershipId &&
					candidate.day === cell.day
			);
			return row && assignmentCell(row);
		},
		weekday: (isoDate) => (isoDate === "2026-10-17" ? "Saturday" : "Friday"),
		gapDay: "2026-10-17",
		memberName,
		groupsOf: (cells, nameOf) =>
			changeTileGroups(
				cells,
				roster,
				(shiftId) =>
					roster.find((row) => row.shift?.shiftId === shiftId)?.shift ??
					undefined,
				nameOf,
				t
			),
		shortNow: [
			{ start: "2026-10-17T09:00:00", end: "2026-10-17T15:00:00", shortBy: 2 },
		],
		offers,
		now: NOW,
		t,
	}).cards;
	return render(
		<I18nextProvider i18n={authTestI18n}>
			<CoverCardItem
				card={card!}
				now={NOW}
				timeZone="Asia/Singapore"
				onReview={onReview}
			/>
		</I18nextProvider>
	).container;
};

describe("CoverCardItem", () => {
	it.each([
		[
			"a call-in on a day off",
			callInOption(),
			/Aisha Rahman comes in on a day offSuggestedWithin hours30 → 36 h of 44 h this week/,
		],
		[
			"a call-in on a rest day",
			restDayCallInOption(),
			/Aisha Rahman comes in on a rest day.*6 h on a rest day.*\+6 h time off earned/,
		],
		[
			"a move",
			moveOption(),
			/Ben Ong moves from Lunch Rush 11:00 – 13:00.*\+2 h extra hours/,
		],
		[
			"a day swap",
			daySwapOption(),
			/Aisha Rahman works this shift instead of Friday Front Desk AM.*Within hours.*30 h of 44 h this week/,
		],
		[
			"a stretch pair, one sentence each, the one who stays on first",
			stretchPairOption(),
			/Ben Ong stays on 2 h, until 15:00Suggested.*Chen Wei starts 2 h early, at 12:00\+4 h overtime/,
		],
	])(
		"given_%s_when_drawn_then_aSentencePerPersonAndOneCostLineWithoutTiles",
		(_case, option, text) => {
			const card = show([option]);

			expect(card).toHaveTextContent(text);
			// No before → after tiles: the sentence says the change.
			expect(card).not.toHaveTextContent("becomes");
		}
	);

	it("given_aSentence_when_drawn_then_theNameStandsInTheCardsNameWeight", () => {
		show([callInOption()]);

		expect(screen.getByText("Aisha Rahman")).toHaveClass("font-semibold");
	});

	it("given_aStretchPair_when_drawn_then_aFaceAndASentenceEachAndNoSharedTitle", () => {
		const card = show([stretchPairOption()]);

		expect(card.querySelectorAll('[role="img"]')).toHaveLength(2);
		expect(card).not.toHaveTextContent("Ben Ong and Chen Wei");
		expect(card).not.toHaveTextContent("Cover it between them");
	});

	it("given_theOlderRepairsChange_when_drawn_then_itsCountAndEachPersonsDaysUnderTheirName", () => {
		expect(show([otherTwoPeopleOption()])).toHaveTextContent(
			/Ben Ong and Aisha Rahman.*2 changes.*Ben Ong.*Lunch Rush.*becomes.*Front Desk AM.*Aisha Rahman.*Day off.*becomes.*Lunch Rush/
		);
	});

	it("given_aPartFill_when_drawn_then_whatIsStillShortInRedAndNotSuggested", () => {
		const card = show([stretchAfterOption()]);

		expect(screen.getByText("Still short 09:00 – 11:00")).toHaveClass(
			"text-error-700"
		);
		expect(card).not.toHaveTextContent("Suggested");
	});

	it("given_onePersonOfTwo_when_drawn_then_aNeutralChipSaysSo", () => {
		show([oneOfTwoOption()]);

		expect(screen.getByText("Fills 1 of 2")).toBeVisible();
	});

	it("given_someoneTakenOffTheShiftEarlier_when_drawn_then_aNeutralChipSaysSoAndNotSuggested", () => {
		const card = show([takenOffCallInOption()]);

		expect(screen.getByText("Taken off this shift earlier")).toBeVisible();
		expect(card).not.toHaveTextContent("Suggested");
	});

	it("given_aCard_when_pressedOrEntered_then_theWholeCardOpensItsReviewNamedForWhoseChangeItIs", async () => {
		const user = userEvent.setup();
		const onReview = vi.fn();
		show([callInOption()], [], onReview);

		const card = screen.getByRole("button", {
			name: "Review Aisha Rahman’s change",
		});
		expect(card).toHaveAccessibleDescription(
			/Aisha Rahman comes in on a day off.*Within hours/
		);
		await user.click(card);
		card.focus();
		await user.keyboard("{Enter}");

		expect(onReview).toHaveBeenCalledTimes(2);
	});

	it("given_aCardThatOpensItsReview_when_queried_then_itHoldsNoOtherControl", () => {
		show([otherTwoPeopleOption()]);

		const card = screen.getByRole("button", { name: /^Review/ });
		expect(card.querySelectorAll("button, a, input, [tabindex]")).toHaveLength(
			0
		);
		expect(screen.getAllByRole("button")).toEqual([card]);
	});

	it("given_aTwoPersonCard_when_drawn_then_itsButtonNamesThemBoth", () => {
		show([stretchPairOption()]);

		expect(
			screen.getByRole("button", {
				name: "Review Ben Ong and Chen Wei’s change",
			})
		).toBeVisible();
	});

	it("given_anOfferOutToItsPerson_when_drawn_then_itsDeadlineInReviewsPlace", () => {
		const card = show(
			[callInOption()],
			[coverOfferFixture({ expiresAt: "2026-10-16T07:30:00Z" })]
		);

		expect(card).toHaveTextContent(/Offer sent · answer by .*3:30/);
		// Nothing to review while the offer is out: a plain card, no chevron.
		expect(screen.queryByRole("button")).toBeNull();
		expect(card.querySelector("svg")).toBeNull();
	});

	it("given_itsPersonDeclined_when_drawn_then_saysSoAndIsNotSuggested", () => {
		const card = show(
			[callInOption()],
			[
				coverOfferFixture({
					status: "DECLINED",
					answeredAt: "2026-10-16T04:00:00Z",
				}),
			]
		);

		expect(card).toHaveTextContent("Declined");
		expect(card).not.toHaveTextContent("Suggested");
		// A new offer can go out from its review, so it still opens it.
		expect(
			screen.getByRole("button", { name: "Review Aisha Rahman’s change" })
		).toHaveTextContent("Declined");
	});
});
