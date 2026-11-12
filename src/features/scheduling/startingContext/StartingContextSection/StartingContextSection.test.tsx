import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configureApiClient, resetApiClient } from "@/common/api-client";
import { envelope, problemReply, stubApi } from "@/common/testing/stubApi";
import { authTestI18n } from "@/features/auth/testingI18n";
import {
	editableMember,
	midMonthOpenings,
} from "@/features/scheduling/hours/fixtures";
import { firstWeek } from "@/features/scheduling/startingContext/fixtures";
import { StartingContextSection } from "@/features/scheduling/startingContext/StartingContextSection";

const UNIT = { branchId: "b-1", departmentId: "d-1" };
const SCHEDULE =
	"/api/v1/companies/c-1/branches/b-1/departments/d-1/schedules/s-1";

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

const show = (): void => {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	render(
		<I18nextProvider i18n={authTestI18n}>
			<QueryClientProvider client={client}>
				<StartingContextSection
					canEdit
					companyId="c-1"
					nonWorkingDayTypes={[]}
					scheduleId="s-1"
					unit={UNIT}
				/>
			</QueryClientProvider>
		</I18nextProvider>
	);
};

/** Leaves the opening balances read pending forever, as a slow request would. */
const holdOpenings = (): void => {
	const answered = globalThis.fetch;
	vi.stubGlobal("fetch", (url: string, init?: RequestInit) =>
		url.includes("/opening-balances")
			? new Promise<Response>(() => {})
			: answered(url, init)
	);
};

describe("StartingContextSection", () => {
	it("given_openingsStillLoading_when_shown_then_lastWeekCannotBeOpenedYet", async () => {
		stubApi({
			[`GET ${SCHEDULE}/starting-days`]: {
				status: 200,
				body: envelope(firstWeek()),
			},
		});
		holdOpenings();
		show();

		expect(await screen.findByText(/No roster before this week/)).toBeVisible();
		expect(
			screen.queryByRole("button", { name: /last week/ })
		).not.toBeInTheDocument();
	});

	it("given_theOpeningsAreRefusedAfterTheDays_when_saved_then_saysTheDaysWentThroughAndKeepsTheDialog", async () => {
		const calls = stubApi({
			[`GET ${SCHEDULE}/starting-days`]: {
				status: 200,
				body: envelope(firstWeek()),
			},
			[`PUT ${SCHEDULE}/starting-days`]: {
				status: 200,
				body: envelope(firstWeek()),
			},
			[`GET ${SCHEDULE}/opening-balances`]: {
				status: 200,
				body: envelope(midMonthOpenings([editableMember("p-tan")])),
			},
			[`PUT ${SCHEDULE}/opening-balances`]: problemReply(
				409,
				"OPENING_BALANCE_LOCKED"
			),
		});
		show();

		await userEvent.click(
			await screen.findByRole("button", { name: /last week/ })
		);
		await userEvent.type(
			screen.getByRole("spinbutton", {
				name: /Tan Wei Ming, paid hours worked/,
			}),
			"72"
		);
		await userEvent.click(screen.getByRole("button", { name: "Save days" }));

		expect(
			await screen.findByText(/Last week’s days were saved, but the hours/)
		).toBeVisible();
		expect(
			screen.getByRole("spinbutton", {
				name: /Tan Wei Ming, paid hours worked/,
			})
		).toHaveValue(72);
		expect(calls.map((call) => `${call.method} ${call.path}`)).toContain(
			`PUT ${SCHEDULE}/starting-days`
		);
	});

	it("given_noOpeningChanged_when_saved_then_onlyTheDaysArePut", async () => {
		const calls = stubApi({
			[`GET ${SCHEDULE}/starting-days`]: {
				status: 200,
				body: envelope(firstWeek()),
			},
			[`PUT ${SCHEDULE}/starting-days`]: {
				status: 200,
				body: envelope(firstWeek()),
			},
			[`GET ${SCHEDULE}/opening-balances`]: {
				status: 200,
				body: envelope(midMonthOpenings([editableMember("p-tan")])),
			},
		});
		show();

		await userEvent.click(
			await screen.findByRole("button", { name: /last week/ })
		);
		await userEvent.click(screen.getByRole("button", { name: "Save days" }));

		await vi.waitFor(() => {
			expect(
				screen.queryByRole("button", { name: "Save days" })
			).not.toBeInTheDocument();
		});
		expect(
			calls.filter((call) => call.method === "PUT").map((call) => call.path)
		).toEqual([`${SCHEDULE}/starting-days`]);
	});
});
