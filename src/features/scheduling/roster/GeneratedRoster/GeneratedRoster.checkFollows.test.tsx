import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type * as Router from "@tanstack/react-router";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createInstance } from "i18next";
import { useState, type ReactElement } from "react";
import { initReactI18next } from "react-i18next";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import en from "@/assets/locales/en/translations.json";
import { configureApiClient, resetApiClient } from "@/common/api-client";
import { envelope, stubApi } from "@/common/testing/stubApi";
import {
	GeneratedRoster,
	type GeneratedRosterProps,
} from "@/features/scheduling/roster/GeneratedRoster";
import type { RosterSearch } from "@/features/scheduling/roster/rosterSearch";
import { rulesCheckFixture } from "@/features/scheduling/rulesCheck/fixtures";
import {
	useRosterRulesCheck,
	type RosterRulesCheckState,
} from "@/features/scheduling/rulesCheck/useRosterRulesCheck";
import {
	generatedScheduleFixture,
	scheduleAssignmentsFixture,
} from "@/features/scheduling/schedules/fixtures";

/*
 * While the Issues panel is open on a roster that may be changed, the rules
 * check follows every move of the roster's revision, and until it answers
 * the leave count shows no short shift (round 4, N1).
 */

beforeAll(async () => {
	await createInstance()
		.use(initReactI18next)
		.init({
			lng: "en",
			resources: { en: { translation: en } },
			interpolation: { escapeValue: false },
		});
});

vi.mock("@tanstack/react-router", async (importOriginal) => ({
	...(await importOriginal<typeof Router>()),
	Link: ({
		search,
		children,
	}: {
		search: Record<string, string>;
		children: React.ReactNode;
	}): React.JSX.Element => (
		<a href={`/leave?${new URLSearchParams(search).toString()}`}>{children}</a>
	),
}));

const schedule = generatedScheduleFixture({ status: "GENERATED" });

describe("GeneratedRoster: the check follows the roster while Issues is open", () => {
	const SCHEDULE =
		"/api/v1/companies/c-1/branches/b-1/departments/d-1/schedules/s-1";
	const target = {
		companyId: "c-1",
		unit: { branchId: "b-1", departmentId: "d-1" },
		scheduleId: "s-1",
		runId: "r-1",
	};
	const editingAt = (revision: number): GeneratedRosterProps["editing"] => ({
		target,
		revision,
		shifts: [],
		nonWorkingDayTypes: [],
		notifiesMembers: false,
	});
	/** Aisha's Monday on leave, which the leave count says leaves her shift short. */
	const withLeaveGap = (): ReturnType<typeof scheduleAssignmentsFixture> =>
		scheduleAssignmentsFixture().map((row) =>
			row.member?.membershipId === "m-1" && row.day === "2026-10-12"
				? { ...row, flag: "ON_LEAVE_WHILE_ROSTERED", uncoveredShift: row.shift }
				: row
		);

	afterEach(() => {
		resetApiClient();
		vi.unstubAllGlobals();
	});

	/** The roster checked by the real rules check, its revision moved by a button as another session would move it. */
	const showMoving = (view: RosterSearch): ReturnType<typeof stubApi> => {
		configureApiClient({
			accessToken: () => Promise.resolve("test-pass"),
			renew: () => Promise.resolve({ kind: "expired" }),
			onUnauthenticated: () => {},
		});
		const calls = stubApi({
			[`POST ${SCHEDULE}/roster-check`]: {
				status: 200,
				body: envelope(rulesCheckFixture({ staffingGaps: [] })),
			},
		});
		const Moving = (): ReactElement => {
			const [revision, setRevision] = useState(1);
			// Hand changes unchecked in this visit: the page checks revision 1 as it opens.
			const validation = useRosterRulesCheck(target, revision, true);
			return (
				<>
					<button
						type="button"
						onClick={() => {
							setRevision(2);
						}}
					>
						Another session changes the roster
					</button>
					<GeneratedRoster
						assignments={scheduleAssignmentsFixture()}
						editing={editingAt(revision)}
						schedule={schedule}
						validation={validation}
						view={view}
						onViewChange={() => {}}
					/>
				</>
			);
		};
		render(
			<QueryClientProvider
				client={
					new QueryClient({ defaultOptions: { queries: { retry: false } } })
				}
			>
				<Moving />
			</QueryClientProvider>
		);
		return calls;
	};
	const checksAt = (
		calls: ReturnType<typeof stubApi>,
		revision: number
	): number =>
		calls.filter(
			(call) =>
				call.path.endsWith("/roster-check") &&
				(call.body as { expectedRevision: number }).expectedRevision ===
					revision
		).length;

	it("given_issuesOpen_when_theRosterMovesWithoutAnActionHere_then_theCheckIsAskedAtTheNewRevisionByItself", async () => {
		const user = userEvent.setup();
		const calls = showMoving({ week: "2026-10-12", panel: "issues" });
		await waitFor(() => {
			expect(checksAt(calls, 1)).toBe(1);
		});

		await user.click(
			screen.getByRole("button", { name: "Another session changes the roster" })
		);

		await waitFor(() => {
			expect(checksAt(calls, 2)).toBe(1);
		});
	});

	it("given_issuesClosed_when_theRosterMoves_then_nothingIsAsked", async () => {
		const user = userEvent.setup();
		const calls = showMoving({ week: "2026-10-12" });
		await waitFor(() => {
			expect(checksAt(calls, 1)).toBe(1);
		});

		await user.click(
			screen.getByRole("button", { name: "Another session changes the roster" })
		);

		expect(checksAt(calls, 2)).toBe(0);
	});

	it.each<[string, RosterRulesCheckState, boolean]>([
		["is under way", { status: "loading" }, false],
		["failed", { status: "refused", refusal: "failed" }, true],
	])(
		"given_aCheckForTheNewRevisionThat_%s_when_issuesShows_then_aLeaveRowIsAShortShiftOnlyWhenNothingBetterIsKnown",
		(_case, state, listedShort) => {
			render(
				<QueryClientProvider client={new QueryClient()}>
					<GeneratedRoster
						assignments={withLeaveGap()}
						editing={editingAt(2)}
						schedule={schedule}
						view={{ week: "2026-10-12", panel: "issues" }}
						validation={{
							...state,
							ask: vi.fn(),
							askAt: vi.fn(),
							last: {
								revision: 1,
								check: rulesCheckFixture({ staffingGaps: [] }),
							},
							revision: 2,
						}}
						onViewChange={() => {}}
					/>
				</QueryClientProvider>
			);

			const panel = screen.getByRole("complementary", { name: "Issues" });
			expect(
				within(panel).queryAllByText(/is on leave, so .* is short\./).length > 0
			).toBe(listedShort);
		}
	);
});
