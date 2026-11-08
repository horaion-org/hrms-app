import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configureApiClient, resetApiClient } from "@/common/api-client";
import { envelope, stubApi, type StubReply } from "@/common/testing/stubApi";
import { authTestI18n } from "@/features/auth/testingI18n";
import {
	BEFORE_DEADLINE,
	coverOfferFixture,
} from "@/features/scheduling/coverOffers/fixtures";
import {
	MyCoverOffers,
	type MyCoverOffersProps,
} from "@/features/scheduling/coverOffers/MyCoverOffers";
import { scheduleAssignmentsFixture } from "@/features/scheduling/schedules/fixtures";

const MINE = "/api/v1/companies/c-1/me/cover-offers";
const offersReply = (
	...offers: Array<ReturnType<typeof coverOfferFixture>>
): StubReply => ({ status: 200, body: envelope(offers) });

beforeEach(() => {
	configureApiClient({
		accessToken: () => Promise.resolve("test-pass"),
		renew: () => Promise.resolve({ kind: "expired" }),
		onUnauthenticated: () => {},
	});
});
afterEach(() => {
	resetApiClient();
	vi.unstubAllGlobals();
});

const show = (props: Partial<MyCoverOffersProps> = {}): void => {
	render(
		<I18nextProvider i18n={authTestI18n}>
			<QueryClientProvider
				client={
					new QueryClient({ defaultOptions: { queries: { retry: false } } })
				}
			>
				<MyCoverOffers
					assignments={scheduleAssignmentsFixture()}
					companyId="c-1"
					now={BEFORE_DEADLINE}
					scheduleId="s-1"
					timeZone="Asia/Singapore"
					viewerMembershipId="m-1"
					{...props}
				/>
			</QueryClientProvider>
		</I18nextProvider>
	);
};

describe("MyCoverOffers", () => {
	it("given_anOpenOffer_when_accepted_then_theCardSaysItIsOnTheRoster", async () => {
		const calls = stubApi({
			[`GET ${MINE}`]: [
				offersReply(coverOfferFixture()),
				offersReply(
					coverOfferFixture({
						status: "APPLIED",
						answeredAt: "2026-10-16T05:19:00Z",
					})
				),
			],
			[`POST ${MINE}/o-1/acceptance`]: {
				status: 200,
				body: envelope(coverOfferFixture({ status: "APPLIED" })),
			},
		});
		show({ linkedOfferId: "o-1" });
		const user = userEvent.setup();

		// What the day holds now, from the roster.
		expect(await screen.findByText("Day off")).toBeVisible();
		await user.click(screen.getByRole("button", { name: "Accept" }));

		expect(await screen.findByRole("status")).toHaveTextContent(
			"You accepted at 01:19 PM. It’s on your roster."
		);
		expect(
			calls.find((call) => call.path === `${MINE}/o-1/acceptance`)?.body
		).toEqual({});
	});

	it("given_aRosterThatMoved_when_accepted_then_saysSoAndTheOfferStaysOpen", async () => {
		stubApi({
			[`GET ${MINE}`]: offersReply(coverOfferFixture()),
			[`POST ${MINE}/o-1/acceptance`]: {
				status: 409,
				body: { errorCode: "COVER_OFFER_STALE" },
			},
		});
		show();
		const user = userEvent.setup();

		await user.click(await screen.findByRole("button", { name: "Accept" }));

		expect(await screen.findByRole("alert")).toHaveTextContent(
			"Your roster changed since this offer was made"
		);
		await waitFor(() => {
			expect(screen.getByRole("button", { name: "Accept" })).toBeEnabled();
		});
	});

	it("given_aDecline_when_sentWithAReason_then_postsIt", async () => {
		const calls = stubApi({
			[`GET ${MINE}`]: offersReply(coverOfferFixture()),
			[`POST ${MINE}/o-1/decline`]: {
				status: 200,
				body: envelope(coverOfferFixture({ status: "DECLINED" })),
			},
		});
		show();
		const user = userEvent.setup();

		await user.click(await screen.findByRole("button", { name: "Decline" }));
		await user.type(screen.getByRole("textbox"), "Exam tomorrow");
		await user.click(screen.getByRole("button", { name: "Send decline" }));

		await waitFor(() => {
			expect(
				calls.find((call) => call.path === `${MINE}/o-1/decline`)?.body
			).toEqual({ reason: "Exam tomorrow" });
		});
	});

	it("given_closedOffersAndNoLink_when_shown_then_showsNothing", async () => {
		const calls = stubApi({
			[`GET ${MINE}`]: offersReply(coverOfferFixture({ status: "DECLINED" })),
		});
		show();

		await waitFor(() => {
			expect(calls).toHaveLength(1);
		});
		expect(screen.queryByRole("region")).toBeNull();
	});

	it("given_aLinkToAnOfferThatIsGone_when_shown_then_saysItIsNotAvailable", async () => {
		stubApi({ [`GET ${MINE}`]: offersReply() });
		show({ linkedOfferId: "o-9" });

		expect(
			await screen.findByText("This offer isn’t available.")
		).toBeVisible();
	});

	it("given_offersThatCouldNotBeRead_when_shown_then_saysSoWithTryAgain", async () => {
		stubApi({ [`GET ${MINE}`]: { status: 400 } });
		show();

		expect(await screen.findByRole("alert")).toHaveTextContent(
			"Couldn’t load your offers."
		);
	});
});
