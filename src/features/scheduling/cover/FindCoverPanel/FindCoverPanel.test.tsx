import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { I18nextProvider } from "react-i18next";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configureApiClient, resetApiClient } from "@/common/api-client";
import { envelope, stubApi } from "@/common/testing/stubApi";
import { authTestI18n } from "@/features/auth/testingI18n";
import {
	feasibleRepair,
	infeasibleRepair,
	reassignMove,
	repairOptionsFixture,
	stretchMove,
} from "@/features/scheduling/cover/engineRepairFixtures";
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
const REPAIR_OPTIONS = `${SCHEDULE}/repair-options`;
const NETWORK_MILLISECONDS = 5;
const SETTLE_MILLISECONDS = 50;
const GAP = coverOptionsFixture().gap;
const GAP_REQUEST = { shiftId: GAP.shiftId, day: GAP.day };
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

/**
 * The panel at revision 1. With `movesRevisionOnApply`, a landed change moves
 * it to revision 2 while it stays open, as the roster's own read does.
 */
const Harness = ({
	props,
	movesRevisionOnApply,
}: {
	props: FindCoverPanelProps;
	movesRevisionOnApply: boolean;
}): React.JSX.Element => {
	const [revision, setRevision] = useState(props.revision);
	return (
		<FindCoverPanel
			{...props}
			revision={revision}
			onApplied={(change) => {
				props.onApplied(change);
				if (movesRevisionOnApply) setRevision(change.toRevision);
			}}
		/>
	);
};

const show = (
	props: Partial<FindCoverPanelProps> = {},
	{ movesRevisionOnApply = false }: { movesRevisionOnApply?: boolean } = {}
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
				<Harness movesRevisionOnApply={movesRevisionOnApply} props={all} />
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

	it("given_theEngineSection_when_asked_then_itsOptionsUnderTheBackendsOwnFeasibleFirst", async () => {
		const calls = stubApi({
			[`POST ${COVER_OPTIONS}`]: answer(coverOptionsFixture()),
			[`POST ${PREVIEW}`]: answer(rosterChangePreviewFixture()),
			[`POST ${REPAIR_OPTIONS}`]: answer(
				repairOptionsFixture([
					infeasibleRepair(),
					...repairOptionsFixture().options,
				])
			),
		});
		show();
		const user = userEvent.setup();
		await screen.findByRole("radio", { name: "Aisha Rahman" });
		expect(
			screen.getByRole("heading", { name: "From the scheduling engine" })
		).toBeInTheDocument();
		expect(calls.filter((call) => call.path === REPAIR_OPTIONS)).toHaveLength(
			0
		);

		await user.click(screen.getByRole("button", { name: "Ask the engine" }));

		const fills = await screen.findByText("Fills the gap");
		const cannot = screen.getByText("Can’t fill the gap");
		expect(
			fills.compareDocumentPosition(cannot) & Node.DOCUMENT_POSITION_FOLLOWING
		).toBeTruthy();
		expect(
			screen.getByText("Call in Aisha Rahman for Front Desk AM Sat, Oct 17")
		).toBeVisible();
		expect(calls.find((call) => call.path === REPAIR_OPTIONS)?.body).toEqual({
			...GAP_REQUEST,
			expectedRevision: 1,
		});
	});

	it("given_aGapTheEngineDidNotReport_when_asked_then_itSaysSoInPlainWords", async () => {
		stubApi({
			[`POST ${COVER_OPTIONS}`]: answer(coverOptionsFixture()),
			[`POST ${PREVIEW}`]: answer(rosterChangePreviewFixture()),
			[`POST ${REPAIR_OPTIONS}`]: {
				status: 409,
				body: {
					status: 409,
					title: "Conflict",
					errorCode: "REPAIR_GAP_NOT_FROM_ENGINE",
				},
			},
		});
		show();
		const user = userEvent.setup();
		await screen.findByRole("radio", { name: "Aisha Rahman" });

		await user.click(screen.getByRole("button", { name: "Ask the engine" }));

		expect(
			await screen.findByText(/The engine didn’t report this gap/)
		).toBeVisible();
	});

	it("given_frozenShiftsNotReadable_when_shown_then_theRostersOwnDaysNameTheShift", async () => {
		stubApi({
			[`POST ${COVER_OPTIONS}`]: answer(coverOptionsFixture()),
			[`POST ${PREVIEW}`]: answer(rosterChangePreviewFixture()),
		});
		show({ shifts: [] });

		expect(
			await screen.findByText(/^Front Desk AM · Sat, Oct 17 · 09:00 – 15:00/)
		).toBeVisible();
		await screen.findByRole("radio", { name: "Aisha Rahman" });
		expect(screen.getByRole("note")).toHaveTextContent(
			"Aisha Rahman works Front Desk AM on Fri, Oct 16"
		);
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

	it("given_anEngineOption_when_reviewedAndApplied_then_itsCellsGoThroughFindCoversOwnPreviewAndApply", async () => {
		const calls = stubApi({
			[`POST ${COVER_OPTIONS}`]: answer(coverOptionsFixture()),
			[`POST ${PREVIEW}`]: answer(rosterChangePreviewFixture()),
			[`POST ${REPAIR_OPTIONS}`]: answer(
				repairOptionsFixture([feasibleRepair([reassignMove()])])
			),
			[`POST ${CHANGES}`]: {
				status: 201,
				body: envelope(rosterChangeFixture()),
			},
		});
		const { onApplied } = show();
		const user = userEvent.setup();
		await screen.findByRole("radio", { name: "Aisha Rahman" });
		await user.click(screen.getByRole("button", { name: "Ask the engine" }));

		await user.click(
			await screen.findByRole("button", { name: "Review this change" })
		);

		const engineCells = [
			{
				membershipId: "m-2",
				day: "2026-10-17",
				kind: "WORK",
				shiftId: reassignMove().shiftId,
			},
		];
		await waitFor(() => {
			expect(
				calls.filter((call) => call.path === PREVIEW).slice(-1)[0]?.body
			).toMatchObject({ cells: engineCells });
		});
		expect(
			screen.getByRole("radio", { name: "Aisha Rahman" })
		).not.toBeChecked();
		// The engine's warning stays in the review, beside the option's own.
		expect(
			screen.getAllByText(/^Not checked against working-time rules/)
		).toHaveLength(2);
		const apply = screen.getByRole("button", { name: "Apply change" });
		await waitFor(() => {
			expect(apply).toBeEnabled();
		});
		await user.click(apply);

		await waitFor(() => {
			expect(onApplied).toHaveBeenCalled();
		});
		expect(calls.find((call) => call.path === CHANGES)?.body).toMatchObject({
			cells: engineCells,
		});
	});

	it("given_anEngineOptionApplied_when_theRosterMovesToItsNewRevision_then_nothingIsAskedAgainAndThePanelSaysCovered", async () => {
		const covered = coverOptionsFixture();
		const calls = stubApi({
			// Once the change lands, the shift is covered at the new revision.
			[`POST ${COVER_OPTIONS}`]: (call) =>
				(call.body as { expectedRevision: number }).expectedRevision === 1
					? answer(coverOptionsFixture())
					: answer({
							...covered,
							revision: 2,
							gap: { ...covered.gap, shortBy: 0 },
							options: [],
						}),
			[`POST ${PREVIEW}`]: answer(rosterChangePreviewFixture()),
			[`POST ${REPAIR_OPTIONS}`]: answer(
				repairOptionsFixture([feasibleRepair([reassignMove()])])
			),
			[`POST ${CHANGES}`]: {
				status: 201,
				body: envelope(rosterChangeFixture()),
			},
		});
		// Every answer takes a moment, as over a network, so the panel renders between asking and the answer.
		const answerAtOnce = globalThis.fetch;
		vi.stubGlobal("fetch", (url: string, init?: RequestInit) =>
			new Promise((settle) => {
				setTimeout(settle, NETWORK_MILLISECONDS);
			}).then(() => answerAtOnce(url, init))
		);
		const props = show({}, { movesRevisionOnApply: true });
		const user = userEvent.setup();
		await screen.findByRole("radio", { name: "Aisha Rahman" });
		await user.click(screen.getByRole("button", { name: "Ask the engine" }));
		await user.click(
			await screen.findByRole("button", { name: "Review this change" })
		);
		const apply = screen.getByRole("button", { name: "Apply change" });
		await waitFor(() => {
			expect(apply).toBeEnabled();
		});

		await user.click(apply);
		await waitFor(() => {
			expect(props.onApplied).toHaveBeenCalled();
		});
		const applied = calls.findIndex((call) => call.path === CHANGES);
		// Covered at the new revision: the panel says so, and the engine's section is gone with its options.
		expect(await screen.findByRole("button", { name: "Close" })).toBeVisible();
		expect(screen.queryByText("Fills the gap")).toBeNull();
		await new Promise((settle) => {
			setTimeout(settle, SETTLE_MILLISECONDS);
		});

		const after = calls.slice(applied + 1);
		const atOldRevision = after.filter(
			(call) =>
				(call.body as { expectedRevision?: number } | undefined)
					?.expectedRevision === 1
		);
		expect(atOldRevision.map((call) => call.path)).toEqual([]);
		expect(after.filter((call) => call.path === PREVIEW)).toEqual([]);
		expect(after.filter((call) => call.path === REPAIR_OPTIONS)).toEqual([]);
	});

	it("given_anEngineOptionApplied_when_theShiftIsStillShortAtTheNewRevision_then_theEngineIsUnaskedAndItsChangeNotPreviewedAgain", async () => {
		const calls = stubApi({
			[`POST ${COVER_OPTIONS}`]: answer(coverOptionsFixture()),
			[`POST ${PREVIEW}`]: answer(rosterChangePreviewFixture()),
			[`POST ${REPAIR_OPTIONS}`]: answer(
				repairOptionsFixture([feasibleRepair([reassignMove()])])
			),
			[`POST ${CHANGES}`]: {
				status: 201,
				body: envelope(rosterChangeFixture()),
			},
		});
		const answerAtOnce = globalThis.fetch;
		vi.stubGlobal("fetch", (url: string, init?: RequestInit) =>
			new Promise((settle) => {
				setTimeout(settle, NETWORK_MILLISECONDS);
			}).then(() => answerAtOnce(url, init))
		);
		const props = show({}, { movesRevisionOnApply: true });
		const user = userEvent.setup();
		await screen.findByRole("radio", { name: "Aisha Rahman" });
		await user.click(screen.getByRole("button", { name: "Ask the engine" }));
		await user.click(
			await screen.findByRole("button", { name: "Review this change" })
		);
		const apply = screen.getByRole("button", { name: "Apply change" });
		await waitFor(() => {
			expect(apply).toBeEnabled();
		});

		await user.click(apply);
		await waitFor(() => {
			expect(props.onApplied).toHaveBeenCalled();
		});

		expect(
			await screen.findByRole("button", { name: "Ask the engine" })
		).toBeVisible();
		// Find cover's own first option is previewed afresh at the new revision; the engine's change never again.
		await waitFor(() => {
			expect(screen.getByRole("radio", { name: "Aisha Rahman" })).toBeChecked();
		});
		const applied = calls.findIndex((call) => call.path === CHANGES);
		const previewsAfter = calls
			.slice(applied + 1)
			.filter((call) => call.path === PREVIEW);
		expect(
			previewsAfter.map(
				(call) => (call.body as { expectedRevision: number }).expectedRevision
			)
		).not.toContain(1);
		expect(previewsAfter.map((call) => call.body)).not.toContainEqual(
			expect.objectContaining({
				cells: [expect.objectContaining({ membershipId: "m-2" })],
			})
		);
	});

	it("given_aStretchOrAPublishedRoster_when_listed_then_madeByHandWithNothingToReview", async () => {
		stubApi({
			[`POST ${COVER_OPTIONS}`]: answer(coverOptionsFixture()),
			[`POST ${PREVIEW}`]: answer(rosterChangePreviewFixture()),
			[`POST ${REPAIR_OPTIONS}`]: answer(
				repairOptionsFixture([feasibleRepair([stretchMove()])])
			),
		});
		show();
		const user = userEvent.setup();
		await screen.findByRole("radio", { name: "Aisha Rahman" });
		await user.click(screen.getByRole("button", { name: "Ask the engine" }));

		expect(
			await screen.findByText(
				"The app can’t apply this one: make it by hand on the roster."
			)
		).toBeVisible();
		expect(
			screen.queryByRole("button", { name: "Review this change" })
		).toBeNull();
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
