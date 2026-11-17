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
import { MemberShiftPreferencesDialog } from "@/features/shiftPreferences/MemberShiftPreferencesDialog";

const MEMBER = "/api/v1/companies/c-1/member-profiles/m-1/shift-preferences";
const WEEK = `GET ${MEMBER}/weeks/${FIXTURE_WEEK}`;
const MONDAY = `PUT ${MEMBER}/days/${FIXTURE_WEEK}`;

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

/** Opens Alex's week of the fixture Monday. */
const show = (): void => {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	render(
		<I18nextProvider i18n={authTestI18n}>
			<QueryClientProvider client={client}>
				<MemberShiftPreferencesDialog
					companyId="c-1"
					membershipId="m-1"
					name="Alex Example"
					weekStartMonday={FIXTURE_WEEK}
					onClose={vi.fn()}
				/>
			</QueryClientProvider>
		</I18nextProvider>
	);
};

const mondayButton = (): Promise<HTMLElement> =>
	screen.findByRole("button", { name: /^Choose shifts for Mon/ });

describe("MemberShiftPreferencesDialog", () => {
	it("given_aMembersWeek_when_opened_then_namesThemAndListsEachDaysPreferredShifts", async () => {
		const calls = stubApi({ [WEEK]: weekReply() });
		show();

		const dialog = screen.getByRole("dialog", {
			name: "Edit shift preferences",
		});
		expect(dialog).toHaveTextContent("The shifts Alex Example would like");
		expect(await mondayButton()).toHaveTextContent("Morning");
		expect(within(dialog).getAllByText("No preference")).toHaveLength(6);
		expect(calls.map((call) => `${call.method} ${call.path}`)).toEqual([WEEK]);
	});

	it("given_anOpenDay_when_itsShiftsAreSaved_then_putsThemToTheMembersRouteAndShowsTheWeekAgain", async () => {
		const user = userEvent.setup();
		const calls = stubApi({
			[WEEK]: weekReply(),
			[MONDAY]: { status: 200, body: envelope(MONDAY_WITH_MORNING) },
		});
		show();

		await user.click(await mondayButton());
		const day = screen.getByRole("dialog", { name: /^Choose shifts for Mon/ });
		await user.click(within(day).getByRole("checkbox", { name: /^Late/ }));
		await user.click(within(day).getByRole("button", { name: "Save" }));

		expect(
			await screen.findByRole("dialog", { name: "Edit shift preferences" })
		).toBeInTheDocument();
		expect(calls.find((call) => call.method === "PUT")?.body).toEqual({
			shiftIds: ["s-morning", "s-late"],
		});
		await waitFor(() => {
			expect(calls.filter((call) => call.method === "GET")).toHaveLength(2);
		});
	});

	it("given_aMemberNoLongerInReach_when_aDayIsSaved_then_theDayStaysOpenAndSaysWhatToDo", async () => {
		const user = userEvent.setup();
		stubApi({
			[WEEK]: weekReply(),
			[MONDAY]: problemReply(404, "MEMBER_PROFILE_NOT_FOUND"),
		});
		show();

		await user.click(await mondayButton());
		const day = screen.getByRole("dialog", { name: /^Choose shifts for Mon/ });
		await user.click(within(day).getByRole("button", { name: "Save" }));

		expect(await within(day).findByRole("alert")).toHaveTextContent(
			"This person is no longer in a team you manage. Close this and reload the list."
		);
	});

	it("given_aDayThatCannotBeChanged_when_shown_then_itIsNotAButtonAndTheDialogSaysWhy", async () => {
		const week = fixtureWeek();
		stubApi({
			[WEEK]: weekReply({
				...week,
				days: week.days.map((day) =>
					day.date === FIXTURE_WEEK ? { ...day, editable: false } : day
				),
			}),
		});
		show();

		expect(
			await screen.findByText(/^Some days can’t be changed/)
		).toBeInTheDocument();
		expect(
			screen.getAllByRole("button", { name: /^Choose shifts for / })
		).toHaveLength(6);
		expect(
			screen.queryByRole("button", { name: /^Choose shifts for Mon/ })
		).not.toBeInTheDocument();
	});

	it("given_aWeekNoDayOfWhichCanBeChanged_when_shown_then_saysNoneCanRatherThanSome", async () => {
		const week = fixtureWeek();
		stubApi({
			[WEEK]: weekReply({
				...week,
				days: week.days.map((day) => ({ ...day, editable: false })),
			}),
		});
		show();

		expect(
			await screen.findByText(/^None of these days can be changed/)
		).toBeInTheDocument();
		expect(screen.queryByText(/^Some days can’t be changed/)).toBeNull();
		expect(
			screen.queryByRole("button", { name: /^Choose shifts for / })
		).not.toBeInTheDocument();
	});

	it("given_aDayNoShiftOfWhichNeedsTheMembersJobTitle_when_opened_then_saysSoOfThemNotTheManager", async () => {
		const user = userEvent.setup();
		const week = fixtureWeek();
		stubApi({
			[WEEK]: weekReply({
				...week,
				days: week.days.map((day) =>
					day.date === FIXTURE_WEEK ? { ...day, shifts: [] } : day
				),
			}),
		});
		show();

		await user.click(await mondayButton());

		const day = screen.getByRole("dialog", { name: /^Choose shifts for Mon/ });
		expect(day).toHaveTextContent("No shift that day needs their job title.");
		expect(day).not.toHaveTextContent("your job title");
	});

	it("given_theWeekCannotBeRead_when_opened_then_saysSoAsAnAlert", async () => {
		stubApi({ [WEEK]: problemReply(404, "MEMBER_PROFILE_NOT_FOUND") });
		show();

		expect(await screen.findByRole("alert")).toHaveTextContent(
			"We couldn’t load Alex Example’s shift preferences. Try again."
		);
	});
});
