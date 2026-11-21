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
	restDayCallInOption,
	stretchAfterOption,
	stretchPairOption,
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
		memberName,
		groupsOf: (cells) =>
			changeTileGroups(
				cells,
				roster,
				(shiftId) =>
					roster.find((row) => row.shift?.shiftId === shiftId)?.shift ??
					undefined,
				memberName,
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
			/Aisha Rahman.*Suggested.*Comes in on a day off.*Sat, Oct 17.*Day off.*Front Desk AM.*Within hours.*30 → 36 h of 44 h this week/,
		],
		[
			"a call-in on a rest day",
			restDayCallInOption(),
			/Comes in on a rest day.*Sun, Oct 18.*Rest day.*6 h on a rest day.*\+6 h time off earned/,
		],
		[
			"a move",
			moveOption(),
			/Ben Ong.*Moves from Lunch Rush.*Lunch Rush.*Front Desk AM.*\+2 h extra hours/,
		],
		[
			"a day swap, each day with its date",
			daySwapOption(),
			/Works Saturday instead of Friday.*Sat, Oct 17.*Day off.*Front Desk AM.*Fri, Oct 16.*Front Desk AM.*Day off/,
		],
		[
			"a stretch pair, each person under their name",
			stretchPairOption(),
			/Ben Ong and Chen Wei.*Cover it between them.*Ben Ong.*Sat, Oct 17.*Chen Wei.*Sat, Oct 17.*\+4 h overtime/,
		],
	])(
		"given_%s_when_drawn_then_whoWhatTheChangeAndTheCost",
		(_case, option, text) => {
			expect(show([option])).toHaveTextContent(text);
		}
	);

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

	it("given_aCard_when_reviewed_then_theButtonNamesWhoseChangeItIs", async () => {
		const onReview = vi.fn();
		show([callInOption()], [], onReview);

		await userEvent.click(
			screen.getByRole("button", { name: "Review Aisha Rahman’s change" })
		);

		expect(onReview).toHaveBeenCalledOnce();
	});

	it("given_anOfferOutToItsPerson_when_drawn_then_itsDeadlineInReviewsPlace", () => {
		const card = show(
			[callInOption()],
			[coverOfferFixture({ expiresAt: "2026-10-16T07:30:00Z" })]
		);

		expect(card).toHaveTextContent(/Offer sent · answer by .*3:30/);
		expect(screen.queryByRole("button", { name: /Review/ })).toBeNull();
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
	});
});
