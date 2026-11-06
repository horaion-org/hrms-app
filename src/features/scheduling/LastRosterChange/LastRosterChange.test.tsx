import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configureApiClient, resetApiClient } from "@/common/api-client";
import { envelope, stubApi } from "@/common/testing/stubApi";
import { authTestI18n } from "@/features/auth/testingI18n";
import { LastRosterChange } from "@/features/scheduling/LastRosterChange";
import type { RosterChange } from "@/features/scheduling/rosterChanges/api";
import {
	rosterChangeFixture,
	rosterChangePreviewFixture,
} from "@/features/scheduling/rosterChanges/fixtures";

const CHANGES =
	"/api/v1/companies/c-1/branches/b-1/departments/d-1/schedules/s-1/roster-changes";

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

const show = (applied?: RosterChange, onAppliedDismissed = vi.fn()): void => {
	render(
		<I18nextProvider i18n={authTestI18n}>
			<QueryClientProvider
				client={
					new QueryClient({ defaultOptions: { queries: { retry: false } } })
				}
			>
				<LastRosterChange
					applied={applied}
					revision={2}
					target={{
						companyId: "c-1",
						unit: { branchId: "b-1", departmentId: "d-1" },
						scheduleId: "s-1",
						runId: "r-1",
					}}
					onAppliedDismissed={onAppliedDismissed}
				/>
			</QueryClientProvider>
		</I18nextProvider>
	);
};

describe("LastRosterChange", () => {
	it("given_anUndoableLatestEdit_when_undone_then_postsItsRevision", async () => {
		const calls = stubApi({
			[`GET ${CHANGES}/latest`]: {
				status: 200,
				body: envelope({ change: rosterChangeFixture() }),
			},
			[`POST ${CHANGES}/rc-1/undo/preview`]: {
				status: 200,
				body: envelope(
					rosterChangePreviewFixture({ expectedRevision: 2, checks: [] })
				),
			},
			[`POST ${CHANGES}/rc-1/undo`]: {
				status: 201,
				body: envelope(
					rosterChangeFixture({ kind: "UNDO", toRevision: 3, undoable: false })
				),
			},
		});
		show();
		const user = userEvent.setup();

		expect(
			await screen.findByText("Last change: Aisha Rahman, Mon, Oct 12")
		).toBeVisible();
		await user.click(screen.getByRole("button", { name: "Undo" }));

		await waitFor(() => {
			expect(
				calls.find((call) => call.path === `${CHANGES}/rc-1/undo`)?.body
			).toEqual({
				expectedRevision: 2,
			});
		});
	});

	it("given_aRosterAsGenerated_when_shown_then_saysNothing", async () => {
		const calls = stubApi({
			[`GET ${CHANGES}/latest`]: {
				status: 200,
				body: envelope({ change: null }),
			},
		});
		show();

		await waitFor(() => {
			expect(calls).toHaveLength(1);
		});
		expect(screen.queryByRole("button", { name: "Undo" })).toBeNull();
	});

	it("given_aChangeJustApplied_when_shown_then_aToastOffersUndo", async () => {
		stubApi({
			[`GET ${CHANGES}/latest`]: {
				status: 200,
				body: envelope({ change: null }),
			},
		});
		show(rosterChangeFixture());

		expect(await screen.findByRole("status")).toHaveTextContent(
			"Roster changed.Undo"
		);
	});
});
