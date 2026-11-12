import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configureApiClient, resetApiClient } from "@/common/api-client";
import { envelope, stubApi } from "@/common/testing/stubApi";
import { authTestI18n } from "@/features/auth/testingI18n";
import { coverOptionsFixture } from "@/features/scheduling/cover/fixtures";
import { coverOfferFixture } from "@/features/scheduling/coverOffers/fixtures";
import {
	rosterChangeFixture,
	rosterChangePreviewFixture,
} from "@/features/scheduling/rosterChanges/fixtures";
import { scheduleAssignmentsFixture } from "@/features/scheduling/schedules/fixtures";
import { frozenShiftsFixture } from "@/features/scheduling/shifts/fixtures";
import { FindCoverPanel, type FindCoverPanelProps } from "./FindCoverPanel";

/*
 * Find cover for Front Desk AM on Saturday 17 October through the stubbed
 * API: Aisha first (within her hours), Chen as overtime, Ben already working.
 */

const SCHEDULE =
	"/api/v1/companies/c-1/branches/b-1/departments/d-1/schedules/s-1";
const COVER_OPTIONS = `${SCHEDULE}/cover-options`;
const PREVIEW = `${SCHEDULE}/roster-changes/preview`;
const CHANGES = `${SCHEDULE}/roster-changes`;
const OFFERS = `${SCHEDULE}/cover-offers`;
const GAP = coverOptionsFixture().gap;
const roster = scheduleAssignmentsFixture();
const answer = (body: unknown): { status: number; body: unknown } => ({
	status: 200,
	body: envelope(body),
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

const show = (
	props: Partial<FindCoverPanelProps> = {}
): FindCoverPanelProps => {
	const all: FindCoverPanelProps = {
		target: {
			companyId: "c-1",
			unit: { branchId: "b-1", departmentId: "d-1" },
			scheduleId: "s-1",
			runId: "r-1",
		},
		revision: 1,
		gap: { shiftId: GAP.shiftId, day: GAP.day },
		assignments: roster,
		dayRow: roster.find((row) => row.day === GAP.day)!,
		shifts: frozenShiftsFixture(),
		onPreviewDays: vi.fn(),
		onApplied: vi.fn(),
		onCoverRecorded: vi.fn(),
		onClose: vi.fn(),
		...props,
	};
	render(
		<I18nextProvider i18n={authTestI18n}>
			<QueryClientProvider
				client={
					new QueryClient({ defaultOptions: { queries: { retry: false } } })
				}
			>
				<FindCoverPanel {...all} />
			</QueryClientProvider>
		</I18nextProvider>
	);
	return all;
};

describe("FindCoverPanel", () => {
	it("given_options_when_shown_then_theGapTheSuggestedFirstChosenAndTheRulesNotCheckedLine", async () => {
		stubApi({
			[`POST ${COVER_OPTIONS}`]: answer(coverOptionsFixture()),
			[`POST ${PREVIEW}`]: answer(rosterChangePreviewFixture()),
		});
		show();

		expect(
			screen.getByRole("heading", { name: "Find cover" })
		).toBeInTheDocument();
		expect(
			await screen.findByRole("radio", { name: "Aisha Rahman" })
		).toBeChecked();
		expect(screen.getByText("1 short since generation")).toBeVisible();
		expect(screen.getByRole("note")).toHaveTextContent(
			"Not checked against the scheduling rules yet."
		);
		// One "not checked" line: the review's own is left out here.
		expect((await screen.findAllByText("Note")).length).toBeGreaterThan(0);
		expect(screen.getAllByRole("note")).toHaveLength(1);
		expect(screen.getByRole("note")).toHaveTextContent(
			"Aisha Rahman works Front Desk AM on"
		);
		expect(
			screen.getByRole("button", { name: "Can't help (1)" })
		).toBeVisible();
	});

	it("given_aDraft_when_applied_then_theChangeGoesInWithTheCells", async () => {
		const calls = stubApi({
			[`POST ${COVER_OPTIONS}`]: answer(coverOptionsFixture()),
			[`POST ${PREVIEW}`]: answer(rosterChangePreviewFixture()),
			[`POST ${CHANGES}`]: {
				status: 201,
				body: envelope(rosterChangeFixture()),
			},
		});
		const { onApplied } = show();
		const user = userEvent.setup();

		const apply = await screen.findByRole("button", { name: "Apply change" });
		await waitFor(() => {
			expect(apply).toBeEnabled();
		});
		await user.click(apply);

		await waitFor(() => {
			expect(onApplied).toHaveBeenCalled();
		});
		expect(calls.find((call) => call.path === CHANGES)?.body).toMatchObject({
			cells: coverOptionsFixture().options[0]!.cells,
		});
	});

	it("given_aPublishedRoster_when_shown_then_sendOfferAndTheyAgreedInPlaceOfApply", async () => {
		const calls = stubApi({
			[`POST ${COVER_OPTIONS}`]: answer(coverOptionsFixture()),
			[`POST ${PREVIEW}`]: answer(rosterChangePreviewFixture()),
			[`POST ${OFFERS}`]: {
				status: 201,
				body: envelope(coverOfferFixture()),
			},
		});
		show({ coverOffers: { offers: [], timeZone: "Asia/Singapore" } });
		const user = userEvent.setup();

		const send = await screen.findByRole("button", { name: "Send offer" });
		expect(screen.getByRole("button", { name: "They agreed" })).toBeVisible();
		expect(screen.queryByRole("button", { name: "Apply change" })).toBeNull();
		await waitFor(() => {
			expect(send).toBeEnabled();
		});
		await user.click(send);

		await waitFor(() => {
			expect(calls.find((call) => call.path === OFFERS)?.body).toMatchObject({
				optionKind: "OFF_DAY_SHIFT",
			});
		});
	});

	it("given_nobodyCanCover_when_shown_then_saysSoWithCantHelpOpen", async () => {
		stubApi({
			[`POST ${COVER_OPTIONS}`]: answer(coverOptionsFixture({ options: [] })),
		});
		show();

		expect(
			await screen.findByText(
				/Nobody on this roster can cover Front Desk AM on/
			)
		).toBeVisible();
		expect(
			screen.getByRole("button", { name: "Can't help (1)" })
		).toHaveAttribute("aria-expanded", "true");
		expect(screen.queryByRole("note")).toBeNull();
	});

	it("given_theRosterMoved_when_shown_then_saysSoWithFindAgain", async () => {
		stubApi({
			[`POST ${COVER_OPTIONS}`]: {
				status: 409,
				body: {
					type: "about:blank",
					title: "Conflict",
					status: 409,
					errorCode: "ROSTER_REVISION_CONFLICT",
				},
			},
		});
		show();

		expect(
			await screen.findByText("The roster changed since this list was made.")
		).toBeVisible();
		expect(screen.getByRole("button", { name: "Find again" })).toBeVisible();
	});

	it("given_theShiftCoveredElsewhere_when_shown_then_saysSoAndCloses", async () => {
		stubApi({
			[`POST ${COVER_OPTIONS}`]: answer(
				coverOptionsFixture({
					gap: { ...GAP, shortBy: 0, shortSinceGeneration: 0 },
					options: [],
					unavailable: [],
				})
			),
		});
		const { onClose } = show();
		const user = userEvent.setup();

		expect(
			await screen.findByText(/Front Desk AM on .* is covered now\./)
		).toBeVisible();
		await user.click(screen.getByRole("button", { name: "Close" }));

		expect(onClose).toHaveBeenCalled();
	});

	it("given_thePanel_when_escapeIsPressed_then_closes", async () => {
		stubApi({
			[`POST ${COVER_OPTIONS}`]: answer(coverOptionsFixture()),
			[`POST ${PREVIEW}`]: answer(rosterChangePreviewFixture()),
		});
		const { onClose } = show();
		const user = userEvent.setup();

		await screen.findByRole("radio", { name: "Aisha Rahman" });
		await user.keyboard("{Escape}");

		expect(onClose).toHaveBeenCalled();
	});
});
