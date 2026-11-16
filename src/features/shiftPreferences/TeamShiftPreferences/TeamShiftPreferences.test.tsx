import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState, type ReactElement } from "react";
import { I18nextProvider } from "react-i18next";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configureApiClient, resetApiClient } from "@/common/api-client";
import { envelope, problemReply, stubApi } from "@/common/testing/stubApi";
import { authTestI18n } from "@/features/auth/testingI18n";
import { storyCompany } from "@/features/people/storyCompany";
import { TEAM_PAGE_SIZE } from "@/features/shiftPreferences/api";
import {
	FIXTURE_WEEK,
	fixtureTeamPage,
	fixtureTeamPageWithFormerMember,
} from "@/features/shiftPreferences/fixtures";
import { TeamShiftPreferences } from "@/features/shiftPreferences/TeamShiftPreferences";

const TEAM_PATH = "/api/v1/companies/c-1/shift-preferences";
const TEAM = `GET ${TEAM_PATH}`;
const READ = "shift_preference:read";
const NEXT_WEEK = "2026-11-30";

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

/** Renders `list` in company c-1, holding `permissions` company-wide, once the router has loaded. */
const showList = (permissions: Array<string>, list: ReactElement): void => {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	// The list renders once the router has loaded; "Loaded" marks that.
	const Story = (): ReactElement => (
		<>
			{list}
			<span>Loaded</span>
		</>
	);
	render(
		<I18nextProvider i18n={authTestI18n}>
			<QueryClientProvider client={client}>
				{storyCompany(client, "c-1")(Story, {
					parameters: { permissions },
				} as never)}
			</QueryClientProvider>
		</I18nextProvider>
	);
};

/** Renders the list for Department d-1 in company c-1, holding `permissions` company-wide. */
const show = (permissions: Array<string>): void => {
	showList(
		permissions,
		<TeamShiftPreferences
			companyId="c-1"
			departmentId="d-1"
			weekStartMonday={FIXTURE_WEEK}
		/>
	);
};

/** The list with buttons that move it to the next week and to Department d-2, as the page's toolbar does. */
const MovingList = (): ReactElement => {
	const [week, setWeek] = useState(FIXTURE_WEEK);
	const [departmentId, setDepartmentId] = useState("d-1");
	return (
		<>
			<button
				type="button"
				onClick={() => {
					setWeek(NEXT_WEEK);
				}}
			>
				Next week
			</button>
			<button
				type="button"
				onClick={() => {
					setDepartmentId("d-2");
				}}
			>
				Kitchen
			</button>
			<TeamShiftPreferences
				companyId="c-1"
				departmentId={departmentId}
				weekStartMonday={week}
			/>
		</>
	);
};

describe("TeamShiftPreferences", () => {
	it("given_theReadKey_when_shown_then_listsEachMembersPreferredShiftsForTheWeek", async () => {
		const calls = stubApi({
			[TEAM]: { status: 200, body: envelope(fixtureTeamPage()) },
		});
		show([READ]);

		const table = await screen.findByRole("table", {
			name: "Team shift preferences",
		});
		expect(within(table).getByRole("rowheader")).toHaveTextContent(
			"Alex Example"
		);
		const cells = within(table).getAllByRole("cell");
		expect(cells).toHaveLength(7);
		expect(cells[0]).toHaveTextContent("Morning");
		expect(cells[1]).toHaveTextContent("No preference");
		// Read-only: no day is a button.
		expect(within(table).queryByRole("button")).not.toBeInTheDocument();
		expect(calls.map((call) => call.search)).toEqual([
			`departmentId=d-1&weekStartMonday=${FIXTURE_WEEK}&page=0&size=${TEAM_PAGE_SIZE}`,
		]);
	});

	it("given_aRemovedMember_when_shown_then_namesThemAsAFormerMember", async () => {
		stubApi({
			[TEAM]: {
				status: 200,
				body: envelope(fixtureTeamPageWithFormerMember()),
			},
		});
		show([READ]);

		const table = await screen.findByRole("table", {
			name: "Team shift preferences",
		});
		expect(
			within(table)
				.getAllByRole("rowheader")
				.map((header) => header.textContent)
		).toEqual(["Alex Example", "Former member"]);
	});

	it("given_aLaterPage_when_theWeekOrDepartmentChanges_then_startsAgainAtTheFirstPage", async () => {
		const user = userEvent.setup();
		const calls = stubApi({
			[TEAM]: {
				status: 200,
				body: envelope({
					...fixtureTeamPage(),
					page: { totalElements: TEAM_PAGE_SIZE * 2 },
				}),
			},
		});
		showList([READ], <MovingList />);

		await user.click(await screen.findByRole("button", { name: "Next page" }));
		await waitFor(() => {
			expect(calls).toHaveLength(2);
		});
		await user.click(screen.getByRole("button", { name: "Next week" }));
		await waitFor(() => {
			expect(calls).toHaveLength(3);
		});
		await user.click(screen.getByRole("button", { name: "Kitchen" }));

		await waitFor(() => {
			expect(calls.map((call) => call.search)).toEqual([
				`departmentId=d-1&weekStartMonday=${FIXTURE_WEEK}&page=0&size=${TEAM_PAGE_SIZE}`,
				`departmentId=d-1&weekStartMonday=${FIXTURE_WEEK}&page=1&size=${TEAM_PAGE_SIZE}`,
				`departmentId=d-1&weekStartMonday=${NEXT_WEEK}&page=0&size=${TEAM_PAGE_SIZE}`,
				`departmentId=d-2&weekStartMonday=${NEXT_WEEK}&page=0&size=${TEAM_PAGE_SIZE}`,
			]);
		});
	});

	it("given_noMembersInReach_when_shown_then_saysSoAcrossTheGrid", async () => {
		stubApi({
			[TEAM]: {
				status: 200,
				body: envelope({ content: [], page: { totalElements: 0 } }),
			},
		});
		show([READ]);

		expect(await screen.findByText("No members here.")).toBeVisible();
	});

	it("given_theReadKeyHeldNowhere_when_shown_then_saysSoAndAsksForNothing", async () => {
		const calls = stubApi({});
		show([]);

		await screen.findByText("Loaded");
		expect(
			screen.getByText(
				"You don’t have access to anyone’s shift preferences in this company."
			)
		).toBeVisible();
		expect(calls).toEqual([]);
	});

	it("given_theApiRefuses_when_shown_then_readsAsNoAccessRatherThanAFailure", async () => {
		stubApi({ [TEAM]: problemReply(403, "FORBIDDEN") });
		show([READ]);

		expect(
			await screen.findByText(
				"You don’t have access to anyone’s shift preferences in this company."
			)
		).toBeVisible();
		expect(screen.queryByRole("alert")).not.toBeInTheDocument();
	});

	it("given_theListCannotBeRead_when_shown_then_saysSoAsAnAlert", async () => {
		// A refusal other than a 403, which the query does not retry.
		stubApi({ [TEAM]: problemReply(400, "BAD_REQUEST") });
		show([READ]);

		expect(await screen.findByRole("alert")).toHaveTextContent(
			"We couldn’t load the team’s shift preferences. Try again."
		);
	});
});
