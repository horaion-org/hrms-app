import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configureApiClient, resetApiClient } from "@/common/api-client";
import { envelope, stubApi, type StubReply } from "@/common/testing/stubApi";
import { authTestI18n } from "@/features/auth/testingI18n";
import { byDay } from "@/features/availability/availabilityModel";
import {
	FIXTURE_WEEK,
	WEEKDAY_MORNINGS,
	weeklyAvailabilityFixture,
} from "@/features/availability/fixtures";
import { MyAvailability } from "@/features/availability/MyAvailability";

const MINE = "/api/v1/companies/c-1/me/availability";
const WEEK = `${MINE}/weeks/${FIXTURE_WEEK}`;

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

const patternReply = (overrideWeeks: Array<string> = []): StubReply => ({
	status: 200,
	body: envelope(
		weeklyAvailabilityFixture(WEEKDAY_MORNINGS, { overrideWeeks })
	),
});

const show = (): void => {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	render(
		<I18nextProvider i18n={authTestI18n}>
			<QueryClientProvider client={client}>
				<MyAvailability
					companyId="c-1"
					name="Aisha Rahman"
					weekStartMonday={FIXTURE_WEEK}
				/>
			</QueryClientProvider>
		</I18nextProvider>
	);
};

describe("MyAvailability", () => {
	it("given_aWeekOnThePattern_when_shown_then_listsThePatternsWindowsWithoutAskingForTheWeek", async () => {
		const calls = stubApi({ [`GET ${MINE}`]: patternReply() });
		show();

		expect(await screen.findAllByText("09:00–13:00")).toHaveLength(5);
		expect(
			screen.getByText("This week follows your default pattern.")
		).toBeVisible();
		expect(screen.queryByText("Custom")).not.toBeInTheDocument();
		expect(calls.map((call) => call.path)).toEqual([MINE]);
	});

	it("given_aWeekWithItsOwnHours_when_shown_then_marksItCustomAndListsThem", async () => {
		stubApi({
			[`GET ${MINE}`]: patternReply([FIXTURE_WEEK]),
			[`GET ${WEEK}`]: {
				status: 200,
				body: envelope({
					membershipId: "m-me",
					weekStartMonday: FIXTURE_WEEK,
					days: byDay([{ day: "SAT", startTime: "10:00", endTime: "14:00" }]),
				}),
			},
		});
		show();

		expect(await screen.findByText("10:00–14:00")).toBeVisible();
		expect(screen.getByText("Custom")).toBeVisible();
		expect(screen.queryByText("09:00–13:00")).not.toBeInTheDocument();
	});

	it("given_thisWeekEdited_when_saved_then_putsTheWeekToTheirOwnRoute", async () => {
		const user = userEvent.setup();
		const calls = stubApi({
			[`GET ${MINE}`]: patternReply(),
			[`PUT ${WEEK}`]: {
				status: 200,
				body: envelope({
					membershipId: "m-me",
					weekStartMonday: FIXTURE_WEEK,
					days: byDay([]),
				}),
			},
		});
		show();
		await screen.findAllByText("09:00–13:00");

		await user.click(screen.getByRole("button", { name: "Edit this week" }));
		const dialog = await screen.findByRole("dialog");
		await user.click(
			within(dialog).getByRole("button", { name: "Not available this week" })
		);

		await waitFor(() => {
			expect(
				calls.filter((call) => call.method === "PUT").map((call) => call.path)
			).toEqual([WEEK]);
		});
		expect(calls.find((call) => call.method === "PUT")?.body).toEqual({
			windows: [],
		});
	});

	it("given_thePatternEdited_when_saved_then_putsTheWholeSetToTheirOwnRoute", async () => {
		const user = userEvent.setup();
		const calls = stubApi({
			[`GET ${MINE}`]: patternReply(),
			[`PUT ${MINE}`]: patternReply(),
		});
		show();
		await screen.findAllByText("09:00–13:00");

		await user.click(
			screen.getByRole("button", { name: "Edit default pattern" })
		);
		const dialog = await screen.findByRole("dialog");
		await user.click(within(dialog).getByRole("button", { name: "Save" }));

		await waitFor(() => {
			expect(
				calls.filter((call) => call.method === "PUT").map((call) => call.path)
			).toEqual([MINE]);
		});
		expect(calls.find((call) => call.method === "PUT")?.body).toEqual({
			windows: WEEKDAY_MORNINGS,
		});
	});

	it("given_theirPatternCannotBeRead_when_shown_then_saysSo", async () => {
		stubApi({ [`GET ${MINE}`]: { status: 404 } });
		show();

		expect(await screen.findByRole("alert")).toHaveTextContent(
			"We couldn’t load the availability. Try again."
		);
	});
});
