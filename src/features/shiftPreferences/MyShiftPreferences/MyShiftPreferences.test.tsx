import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configureApiClient, resetApiClient } from "@/common/api-client";
import {
	envelope,
	problemReply,
	stubApi,
	type StubReply,
} from "@/common/testing/stubApi";
import { authTestI18n } from "@/features/auth/testingI18n";
import {
	FIXTURE_WEEK,
	fixtureWeek,
	MONDAY_WITH_MORNING,
} from "@/features/shiftPreferences/fixtures";
import { MyShiftPreferences } from "@/features/shiftPreferences/MyShiftPreferences";

const MINE = "/api/v1/companies/c-1/me/shift-preferences";
const MONDAY = `PUT ${MINE}/days/${FIXTURE_WEEK}`;

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

const weekReply = (week = fixtureWeek()): StubReply => ({
	status: 200,
	body: envelope(week),
});

const show = (shownDay?: string, weekEnded?: boolean): void => {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	render(
		<I18nextProvider i18n={authTestI18n}>
			<QueryClientProvider client={client}>
				<MyShiftPreferences
					companyId="c-1"
					shownDay={shownDay}
					weekEnded={weekEnded}
					weekStartMonday={FIXTURE_WEEK}
				/>
			</QueryClientProvider>
		</I18nextProvider>
	);
};

const mondayButton = (): Promise<HTMLElement> =>
	screen.findByRole("button", { name: /^Choose shifts for Mon/ });

describe("MyShiftPreferences", () => {
	it("given_aWeek_when_shown_then_listsEachDaysPreferredShiftsAsChips", async () => {
		const calls = stubApi({ [`GET ${MINE}`]: weekReply() });
		show();

		const table = await screen.findByRole("table", {
			name: "Shift preferences",
		});
		const cells = within(table).getAllByRole("cell");
		expect(cells).toHaveLength(7);
		expect(cells[0]).toHaveTextContent("Morning");
		expect(cells[0]).not.toHaveTextContent("Late");
		expect(cells[1]).toHaveTextContent("No preference");
		expect(
			screen.getByText(/They’re weighed fairly when the roster is made/)
		).toBeVisible();
		expect(calls.map((call) => call.search)).toEqual([
			`weekStartMonday=${FIXTURE_WEEK}`,
		]);
	});

	it("given_aDayThatCannotBeChanged_when_shown_then_itIsNotAButton", async () => {
		const week = fixtureWeek();
		stubApi({
			[`GET ${MINE}`]: weekReply({
				...week,
				days: week.days.map((day) =>
					day.date === FIXTURE_WEEK ? { ...day, editable: false } : day
				),
			}),
		});
		show();

		await screen.findByRole("table", { name: "Shift preferences" });
		expect(
			screen.getAllByRole("button", { name: /^Choose shifts for / })
		).toHaveLength(6);
		expect(
			screen.queryByRole("button", { name: /^Choose shifts for Mon/ })
		).not.toBeInTheDocument();
		expect(
			screen.getByText(
				"Some days can’t be changed: preferences are open from today to eight weeks ahead."
			)
		).toBeVisible();
	});

	it("given_aWeekThatHasEnded_when_shown_then_saysSoRatherThanThatDaysAreOutOfReach", async () => {
		const week = fixtureWeek();
		stubApi({
			[`GET ${MINE}`]: weekReply({
				...week,
				days: week.days.map((day) => ({ ...day, editable: false })),
			}),
		});
		show(undefined, true);

		expect(
			await screen.findByText(
				"This week has ended, so its preferences can’t be changed."
			)
		).toBeVisible();
		expect(
			screen.queryByText(/^Some days can’t be changed/)
		).not.toBeInTheDocument();
	});

	it("given_everyDayOpen_when_shown_then_givesNoReason", async () => {
		stubApi({ [`GET ${MINE}`]: weekReply() });
		show();

		await screen.findByRole("table", { name: "Shift preferences" });
		expect(screen.queryByText(/can’t be changed/)).not.toBeInTheDocument();
	});

	it("given_aShownDay_when_shown_then_onlyThatDaysColumnShowsBelowMd", async () => {
		stubApi({ [`GET ${MINE}`]: weekReply() });
		show("2026-11-25");

		await screen.findByRole("table", { name: "Shift preferences" });
		const visible = screen
			.getAllByRole("columnheader")
			.filter((header) => !header.classList.contains("hidden"));
		expect(visible.map((header) => header.textContent)).toEqual(["WedNov 25"]);
	});

	it("given_anOpenDay_when_itsShiftsAreSaved_then_replacesTheDayAndReadsTheWeekAgain", async () => {
		const user = userEvent.setup();
		const calls = stubApi({
			[`GET ${MINE}`]: weekReply(),
			[MONDAY]: { status: 200, body: envelope(MONDAY_WITH_MORNING) },
		});
		show();

		await user.click(await mondayButton());
		const dialog = await screen.findByRole("dialog");
		await user.click(within(dialog).getByRole("checkbox", { name: /^Late/ }));
		await user.click(within(dialog).getByRole("button", { name: "Save" }));

		await waitFor(() => {
			expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
		});
		expect(calls.find((call) => call.method === "PUT")?.body).toEqual({
			shiftIds: ["s-morning", "s-late"],
		});
		await waitFor(() => {
			expect(calls.filter((call) => call.method === "GET")).toHaveLength(2);
		});
	});

	it("given_aRefusedSave_when_shown_then_theDialogStaysOpenAndSaysWhy", async () => {
		const user = userEvent.setup();
		stubApi({
			[`GET ${MINE}`]: weekReply(),
			[MONDAY]: problemReply(400, "SHIFT_PREFERENCE_TOO_MANY_SHIFTS"),
		});
		show();

		await user.click(await mondayButton());
		const dialog = await screen.findByRole("dialog");
		await user.click(within(dialog).getByRole("button", { name: "Save" }));

		expect(await within(dialog).findByRole("alert")).toHaveTextContent(
			"Choose up to 5 shifts for a day."
		);
	});

	it("given_theWeekCannotBeRead_when_shown_then_saysSoAsAnAlert", async () => {
		// A refusal, which the query does not retry.
		stubApi({ [`GET ${MINE}`]: problemReply(400, "BAD_REQUEST") });
		show();

		expect(await screen.findByRole("alert")).toHaveTextContent(
			"We couldn’t load your shift preferences. Try again."
		);
	});
});
