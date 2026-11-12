import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it, vi } from "vitest";
import { authTestI18n } from "@/features/auth/testingI18n";
import type { CoverOffer } from "@/features/scheduling/coverOffers/api";
import {
	CoverOfferCard,
	type CoverOfferCardProps,
} from "@/features/scheduling/coverOffers/CoverOfferCard";
import {
	BEFORE_DEADLINE,
	coverOfferFixture,
} from "@/features/scheduling/coverOffers/fixtures";

const show = (
	props: Partial<CoverOfferCardProps> = {}
): CoverOfferCardProps => {
	const all: CoverOfferCardProps = {
		offer: coverOfferFixture(),
		timeZone: "Asia/Singapore",
		now: BEFORE_DEADLINE,
		was: "Day off",
		onAccept: vi.fn(),
		onDecline: vi.fn(),
		...props,
	};
	render(
		<I18nextProvider i18n={authTestI18n}>
			<CoverOfferCard {...all} />
		</I18nextProvider>
	);
	return all;
};

const closed = (
	overrides: Partial<CoverOffer>
): Partial<CoverOfferCardProps> => ({
	offer: coverOfferFixture(overrides),
});

describe("CoverOfferCard", () => {
	it("given_anOfferWithinTheMembersContractedWeek_when_shown_then_saysSoAndNotOvertime", () => {
		show({
			offer: coverOfferFixture({
				pay: { normalMinutes: 360, extraMinutes: 0, overtimeMinutes: 0 },
			}),
		});

		const card = screen.getByRole("region", { name: "Shift offered" });
		expect(card).toHaveTextContent("Within contracted hours");
		expect(card).not.toHaveTextContent("Overtime");
	});

	it("given_anOpenOffer_when_shown_then_saysWhenWhatChangesThePayWhoAskedAndByWhen", () => {
		show();

		const card = screen.getByRole("region", { name: "Shift offered" });
		expect(card).toHaveTextContent("Sat, Oct 17 · Front Desk AM");
		expect(card).toHaveTextContent("Day off");
		expect(card).toHaveTextContent("Overtime · 6 h");
		expect(card).toHaveTextContent("Lina Tan, for the company");
		expect(screen.getByText(/03:30/)).toHaveAttribute(
			"dateTime",
			"2026-10-16T07:30:00Z"
		);
		expect(screen.getByText("Ana is off sick, can you help?")).toBeVisible();
		expect(screen.getByRole("button", { name: "Accept" })).toBeEnabled();
	});

	it("given_anOpenOffer_when_acceptIsTapped_then_acceptsInOneTap", async () => {
		const props = show();

		await userEvent
			.setup()
			.click(screen.getByRole("button", { name: "Accept" }));

		expect(props.onAccept).toHaveBeenCalledOnce();
	});

	it("given_anOpenOffer_when_declinedWithAReason_then_sendsTheReason", async () => {
		const props = show();
		const user = userEvent.setup();

		await user.click(screen.getByRole("button", { name: "Decline" }));
		await user.type(
			screen.getByRole("textbox", {
				name: "Want to tell Lina Tan why? (optional)",
			}),
			"  Exam tomorrow "
		);
		await user.click(screen.getByRole("button", { name: "Send decline" }));

		expect(props.onDecline).toHaveBeenCalledWith("Exam tomorrow");
	});

	it("given_aDeclineWithoutAReason_when_sent_then_sendsNone", async () => {
		const props = show();
		const user = userEvent.setup();

		await user.click(screen.getByRole("button", { name: "Decline" }));
		await user.click(screen.getByRole("button", { name: "Send decline" }));

		expect(props.onDecline).toHaveBeenCalledWith(undefined);
	});

	it.each([
		[
			"accepted",
			closed({ status: "APPLIED", answeredAt: "2026-10-16T05:12:00Z" }),
			/You accepted at 01:12 PM\. It’s on your roster\./,
		],
		[
			"declined",
			closed({ status: "DECLINED", answeredAt: "2026-10-16T05:12:00Z" }),
			/You declined at 01:12 PM\./,
		],
		[
			"expired",
			closed({ status: "EXPIRED" }),
			/Time ran out at 03:30 PM\. Lina Tan will find someone else\./,
		],
		[
			"withdrawn",
			closed({ status: "WITHDRAWN" }),
			/someone else took the shift, or it was withdrawn/,
		],
	] as const)(
		"given_a %s offer_when_shown_then_saysWhyInPlaceOfTheButtons",
		(_, props, line) => {
			show(props);

			expect(screen.getByRole("status")).toHaveTextContent(line);
			expect(screen.queryByRole("button", { name: "Accept" })).toBeNull();
		}
	);

	it("given_theDeadlinePasses_when_theClockMoves_then_theButtonsGo", () => {
		show({ now: new Date("2026-10-16T07:30:00Z") });

		expect(screen.getByRole("status")).toHaveTextContent(
			"Time ran out at 03:30 PM"
		);
		expect(screen.queryByRole("button", { name: "Decline" })).toBeNull();
	});

	it("given_aStaleRoster_when_refused_then_saysSoAndKeepsTheButtons", () => {
		show({ refusal: "stale" });

		expect(screen.getByRole("alert")).toHaveTextContent(
			"Your roster changed since this offer was made"
		);
		expect(screen.getByRole("button", { name: "Accept" })).toBeVisible();
	});
});
