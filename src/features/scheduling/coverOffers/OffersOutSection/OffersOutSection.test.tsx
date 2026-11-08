import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configureApiClient, resetApiClient } from "@/common/api-client";
import { envelope, stubApi } from "@/common/testing/stubApi";
import { authTestI18n } from "@/features/auth/testingI18n";
import {
	BEFORE_DEADLINE,
	coverOfferFixture,
} from "@/features/scheduling/coverOffers/fixtures";
import {
	OffersOutSection,
	type OffersOutSectionProps,
} from "@/features/scheduling/coverOffers/OffersOutSection";

const OFFERS =
	"/api/v1/companies/c-1/branches/b-1/departments/d-1/schedules/s-1/cover-offers";
const open = coverOfferFixture();
const declined = coverOfferFixture({
	offerId: "o-2",
	member: { ...open.member!, membershipId: "m-2", displayName: "Ben Ong" },
	optionKind: "MOVE",
	status: "DECLINED",
	answeredAt: "2026-10-16T04:12:00Z",
	answerReason: "Exam tomorrow",
});

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

const show = (props: Partial<OffersOutSectionProps> = {}): void => {
	render(
		<I18nextProvider i18n={authTestI18n}>
			<QueryClientProvider client={new QueryClient()}>
				<OffersOutSection
					assignments={[{ day: "2026-10-17", uncoveredShift: open.shift }]}
					now={BEFORE_DEADLINE}
					offers={[declined, open]}
					timeZone="Asia/Singapore"
					target={{
						companyId: "c-1",
						unit: { branchId: "b-1", departmentId: "d-1" },
						scheduleId: "s-1",
					}}
					{...props}
				/>
			</QueryClientProvider>
		</I18nextProvider>
	);
};

describe("OffersOutSection", () => {
	it("given_offersForAShortShift_when_shown_then_listsThemUnderItWaitingFirst", () => {
		show();

		expect(screen.getByRole("heading", { name: "Offers out" })).toBeVisible();
		expect(
			screen.getByText("Sat, Oct 17 · Front Desk AM 09:00 – 15:00")
		).toBeVisible();
		expect(screen.getByText("2 offers out · first yes wins")).toBeVisible();
		const lines = screen.getAllByRole("listitem").slice(1);
		expect(lines[0]).toHaveTextContent(
			"Aisha Rahman · Overtime · 6 h · waiting, answer by 03:30 PM"
		);
		expect(lines[1]).toHaveTextContent(
			"Ben Ong · Same hours, different shift · declined 12:12 PMExam tomorrow"
		);
	});

	it("given_aWaitingOffer_when_withdrawn_then_postsTheWithdrawal", async () => {
		const calls = stubApi({
			[`POST ${OFFERS}/o-1/withdrawal`]: {
				status: 200,
				body: envelope(coverOfferFixture({ status: "WITHDRAWN" })),
			},
		});
		show();

		await userEvent.setup().click(
			screen.getByRole("button", {
				name: "Withdraw the offer to Aisha Rahman",
			})
		);

		await waitFor(() => {
			expect(calls.map((call) => `${call.method} ${call.path}`)).toContain(
				`POST ${OFFERS}/o-1/withdrawal`
			);
		});
		expect(
			screen.queryByRole("button", { name: "Withdraw the offer to Ben Ong" })
		).toBeNull();
	});

	it("given_offersThatCouldNotBeRead_when_shown_then_saysSoWithTryAgain", async () => {
		const onRetry = vi.fn();
		show({ failed: true, onRetry });

		expect(screen.getByRole("alert")).toHaveTextContent(
			"Couldn’t load offers."
		);
		await userEvent
			.setup()
			.click(screen.getByRole("button", { name: "Try again" }));
		expect(onRetry).toHaveBeenCalledOnce();
	});

	it("given_onlyAFilledGap_when_shown_then_showsNothing", () => {
		show({ offers: [coverOfferFixture({ status: "APPLIED" })] });

		expect(screen.queryByRole("heading", { name: "Offers out" })).toBeNull();
	});
});
