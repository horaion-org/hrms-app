import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it, vi } from "vitest";
import { authTestI18n } from "@/features/auth/testingI18n";
import {
	CoverOfferActions,
	type CoverOfferActionsProps,
} from "@/features/scheduling/coverOffers/CoverOfferActions";
import {
	BEFORE_DEADLINE,
	coverOfferFixture,
} from "@/features/scheduling/coverOffers/fixtures";

const ben = {
	...coverOfferFixture().member!,
	membershipId: "m-2",
	displayName: "Ben Ong",
};

const show = (
	props: Partial<CoverOfferActionsProps> = {}
): CoverOfferActionsProps => {
	const all: CoverOfferActionsProps = {
		name: "Aisha Rahman",
		timeZone: "Asia/Singapore",
		ready: true,
		onSend: vi.fn(),
		onRecord: vi.fn(),
		now: (): Date => BEFORE_DEADLINE,
		...props,
	};
	render(
		<I18nextProvider i18n={authTestI18n}>
			<CoverOfferActions {...all} />
		</I18nextProvider>
	);
	return all;
};

describe("CoverOfferActions", () => {
	it("given_aChangeThatNeedsAYes_when_shown_then_saysWhyAndOffersBothWays", async () => {
		const props = show();

		expect(
			screen.getByText("The roster is published, so Aisha Rahman must agree.")
		).toBeVisible();
		expect(screen.getByRole("button", { name: "They agreed" })).toBeEnabled();
		await userEvent
			.setup()
			.click(screen.getByRole("button", { name: "Send offer" }));
		expect(props.onSend).toHaveBeenCalledOnce();
	});

	it("given_aChangeNotReady_when_shown_then_neitherWayIsOpen", () => {
		show({ ready: false });

		expect(screen.getByRole("button", { name: "Send offer" })).toBeDisabled();
		expect(screen.getByRole("button", { name: "They agreed" })).toBeDisabled();
	});

	it("given_theyAgreed_when_recordedWithoutHow_then_asksForItAndSendsNothing", async () => {
		const props = show();
		const user = userEvent.setup();

		await user.click(screen.getByRole("button", { name: "They agreed" }));
		expect(screen.getByRole("button", { name: "How" })).toHaveFocus();
		await user.click(screen.getByRole("button", { name: "Record and apply" }));

		expect(screen.getByRole("alert")).toHaveTextContent(
			"Choose how they agreed."
		);
		expect(props.onRecord).not.toHaveBeenCalled();
	});

	it("given_theyAgreedByPhone_when_recorded_then_sendsHowAndTheInstantToday", async () => {
		const props = show();
		const user = userEvent.setup();

		await user.click(screen.getByRole("button", { name: "They agreed" }));
		await user.click(screen.getByRole("button", { name: "How" }));
		await user.click(screen.getByRole("option", { name: "Phone call" }));
		await user.click(screen.getByRole("button", { name: "Record and apply" }));

		// The latest half hour before 13:18 in Singapore.
		expect(props.onRecord).toHaveBeenCalledWith({
			how: "PHONE",
			when: "2026-10-16T05:00:00.000Z",
		});
	});

	it("given_aTimeLaterThanNow_when_chosen_then_saysItMustHavePassed", async () => {
		show();
		const user = userEvent.setup();

		await user.click(screen.getByRole("button", { name: "They agreed" }));
		await user.click(screen.getByRole("button", { name: "When" }));
		await user.click(screen.getByRole("option", { name: "14:00" }));

		expect(screen.getByRole("alert")).toHaveTextContent(
			"Choose a time that has already passed."
		);
	});

	it("given_theRecordSection_when_backIsChosen_then_focusReturnsToTheyAgreed", async () => {
		show();
		const user = userEvent.setup();

		await user.click(screen.getByRole("button", { name: "They agreed" }));
		await user.click(screen.getByRole("button", { name: "Back" }));

		expect(screen.getByRole("button", { name: "They agreed" })).toHaveFocus();
	});

	it("given_anotherOfferOutForTheGap_when_shown_then_saysTheFirstYesWins", () => {
		show({ rivals: [coverOfferFixture({ offerId: "o-2", member: ben })] });

		expect(
			screen.getByText(
				/1 offer out for this shift: Ben Ong \(03:30 PM\)\. Sending this one too means the first yes wins\./
			)
		).toBeVisible();
	});

	it("given_threeOffersOut_when_shown_then_sendsNoMore", () => {
		show({
			rivals: ["o-2", "o-3", "o-4"].map((offerId) =>
				coverOfferFixture({ offerId, member: ben })
			),
		});

		expect(
			screen.getByText("3 offers are already out for this shift.")
		).toBeVisible();
		expect(screen.queryByRole("button", { name: "Send offer" })).toBeNull();
	});

	it("given_aRefusal_when_shown_then_saysItBesideTheButtons", () => {
		show({ refusal: "alreadyOpen" });

		expect(screen.getByRole("alert")).toHaveTextContent(
			"Aisha Rahman already has an offer for this day."
		);
	});
});
