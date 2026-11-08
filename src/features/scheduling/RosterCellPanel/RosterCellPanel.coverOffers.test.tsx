import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configureApiClient, resetApiClient } from "@/common/api-client";
import { envelope, stubApi } from "@/common/testing/stubApi";
import { authTestI18n } from "@/features/auth/testingI18n";
import type { CoverOffer } from "@/features/scheduling/coverOffers/api";
import { coverOfferFixture } from "@/features/scheduling/coverOffers/fixtures";
import {
	RosterCellPanel,
	type RosterCellPanelProps,
} from "@/features/scheduling/RosterCellPanel";
import { rosterChangePreviewFixture } from "@/features/scheduling/rosterChanges/fixtures";
import { scheduleAssignmentsFixture } from "@/features/scheduling/schedules/fixtures";
import { frozenShiftsFixture } from "@/features/scheduling/shifts/fixtures";

/*
 * A published roster through the mocked API: moving Ben's Friday from Lunch
 * Rush to Front Desk AM waits for his yes, sent as an offer or recorded as
 * already given.
 */

vi.mock("@tanstack/react-router", () => ({
	Link: ({ children }: { children: React.ReactNode }): React.JSX.Element => (
		<a href="/leave">{children}</a>
	),
}));

const SCHEDULE =
	"/api/v1/companies/c-1/branches/b-1/departments/d-1/schedules/s-1";
const PREVIEW = `${SCHEDULE}/roster-changes/preview`;
const OFFERS = `${SCHEDULE}/cover-offers`;
const roster = scheduleAssignmentsFixture();
const friday = roster.find(
	(row) => row.member?.membershipId === "m-2" && row.day === "2026-10-16"
)!;
const ben = {
	...coverOfferFixture().member!,
	membershipId: "m-2",
	displayName: "Ben Ong",
};
const preview = {
	status: 200,
	body: envelope(rosterChangePreviewFixture()),
};

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

const show = (
	offers: ReadonlyArray<CoverOffer> = [],
	props: Partial<RosterCellPanelProps> = {}
): RosterCellPanelProps => {
	const all: RosterCellPanelProps = {
		target: {
			companyId: "c-1",
			unit: { branchId: "b-1", departmentId: "d-1" },
			scheduleId: "s-1",
			runId: "r-1",
		},
		revision: 4,
		assignment: friday,
		assignments: roster,
		shifts: frozenShiftsFixture(),
		notifiesMembers: true,
		coverOffers: { offers, timeZone: "Asia/Singapore" },
		onClose: vi.fn(),
		onPreviewDays: vi.fn(),
		onApplied: vi.fn(),
		onCoverRecorded: vi.fn(),
		...props,
	};
	render(
		<I18nextProvider i18n={authTestI18n}>
			<QueryClientProvider
				client={
					new QueryClient({ defaultOptions: { queries: { retry: false } } })
				}
			>
				<RosterCellPanel {...all} />
			</QueryClientProvider>
		</I18nextProvider>
	);
	return all;
};

/** Chooses Another shift and its first option, then waits for the preview. */
const chooseAnotherShift = async (
	user: ReturnType<typeof userEvent.setup>
): Promise<void> => {
	await user.click(screen.getByRole("radio", { name: "Another shift" }));
	await user.click(screen.getByRole("button", { name: "Shift" }));
	await user.click((await screen.findAllByRole("option"))[0]!);
	await screen.findByText("The roster is published, so Ben Ong must agree.");
};

describe("RosterCellPanel on a published roster", () => {
	it("given_anotherShift_when_offerIsSent_then_postsTheOfferAndSaysItWasSent", async () => {
		const calls = stubApi({
			[`POST ${PREVIEW}`]: preview,
			[`POST ${OFFERS}`]: {
				status: 201,
				body: envelope(
					coverOfferFixture({
						rosterDate: "2026-10-16",
						optionKind: "MOVE",
						member: ben,
					})
				),
			},
		});
		show();
		const user = userEvent.setup();

		await chooseAnotherShift(user);
		expect(screen.queryByRole("button", { name: "Apply change" })).toBeNull();
		await user.click(screen.getByRole("button", { name: "Send offer" }));

		expect(
			await screen.findByText(/Offer sent to Ben Ong · answer by/)
		).toBeVisible();
		const sent = calls.find(
			(call) => call.method === "POST" && call.path === OFFERS
		);
		expect(sent?.body).toEqual({
			optionKind: "MOVE",
			rosterDate: "2026-10-16",
			expectedRevision: 4,
			cells: [
				expect.objectContaining({
					membershipId: "m-2",
					day: "2026-10-16",
					kind: "WORK",
				}),
			],
			send: true,
		});
	});

	it("given_anotherOfferOutForTheGap_when_sent_then_racesIt", async () => {
		const calls = stubApi({
			[`POST ${PREVIEW}`]: preview,
			[`POST ${OFFERS}`]: { status: 201, body: envelope(coverOfferFixture()) },
		});
		const user = userEvent.setup();
		show();
		await chooseAnotherShift(user);
		const chosen = (
			calls.find((call) => call.path === PREVIEW)?.body as {
				cells: Array<{ shiftId: string }>;
			}
		).cells[0]!.shiftId;
		vi.unstubAllGlobals();
		cleanup();

		const raced = stubApi({
			[`POST ${PREVIEW}`]: preview,
			[`POST ${OFFERS}`]: { status: 201, body: envelope(coverOfferFixture()) },
		});
		show([
			coverOfferFixture({
				offerId: "o-9",
				rosterDate: "2026-10-16",
				optionKind: "MOVE",
				shift: { ...coverOfferFixture().shift!, shiftId: chosen },
			}),
		]);
		await chooseAnotherShift(user);
		expect(
			screen.getByText(/1 offer out for this shift: Aisha Rahman/)
		).toBeVisible();
		await user.click(screen.getByRole("button", { name: "Send offer" }));

		await waitFor(() => {
			expect(raced.find((call) => call.path === OFFERS)?.body).toMatchObject({
				parallelTo: "o-9",
				send: true,
			});
		});
	});

	it("given_theyAgreedByPhone_when_recorded_then_appliesAtOnce", async () => {
		const calls = stubApi({
			[`POST ${PREVIEW}`]: preview,
			[`POST ${OFFERS}`]: {
				status: 201,
				body: envelope(
					coverOfferFixture({
						status: "APPLIED",
						channel: "RECORDED",
						expiresAt: null,
						recordedHow: "PHONE",
					})
				),
			},
		});
		const props = show();
		const user = userEvent.setup();

		await chooseAnotherShift(user);
		await user.click(screen.getByRole("button", { name: "They agreed" }));
		await user.click(screen.getByRole("button", { name: "How" }));
		await user.click(screen.getByRole("option", { name: "Phone call" }));
		await user.click(screen.getByRole("button", { name: "Record and apply" }));

		await waitFor(() => {
			expect(props.onCoverRecorded).toHaveBeenCalled();
		});
		const body = calls.find((call) => call.path === OFFERS)?.body as {
			recorded: { how: string; when: string };
			send?: boolean;
		};
		expect(body.recorded.how).toBe("PHONE");
		expect(Number.isNaN(Date.parse(body.recorded.when))).toBe(false);
		expect(body.send).toBeUndefined();
	});

	it("given_theRosterMoved_when_theOfferIsRefused_then_saysToReload", async () => {
		stubApi({
			[`POST ${PREVIEW}`]: preview,
			[`POST ${OFFERS}`]: {
				status: 409,
				body: { errorCode: "ROSTER_REVISION_CONFLICT" },
			},
		});
		show();
		const user = userEvent.setup();

		await chooseAnotherShift(user);
		await user.click(screen.getByRole("button", { name: "Send offer" }));

		expect(await screen.findByRole("alert")).toHaveTextContent(
			"The roster changed since you looked. Reload."
		);
	});

	it("given_aDayOff_when_chosen_then_keepsApplyAndNotify", async () => {
		stubApi({ [`POST ${PREVIEW}`]: preview });
		show();
		const user = userEvent.setup();

		await user.click(screen.getByRole("radio", { name: "Day off" }));

		expect(
			await screen.findByRole("button", { name: "Apply change" })
		).toBeVisible();
		expect(screen.queryByRole("button", { name: "Send offer" })).toBeNull();
	});

	it("given_anOpenOfferForTheDay_when_opened_then_showsItWithWithdraw", () => {
		stubApi({});
		show([coverOfferFixture({ rosterDate: "2026-10-16", member: ben })]);

		expect(screen.getByText(/Offer sent to Ben Ong · answer by/)).toBeVisible();
		expect(
			screen.getByRole("button", { name: "Withdraw offer" })
		).toBeVisible();
	});
});
