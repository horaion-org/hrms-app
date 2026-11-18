import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configureApiClient, resetApiClient } from "@/common/api-client";
import { envelope, stubApi } from "@/common/testing/stubApi";
import { authTestI18n } from "@/features/auth/testingI18n";
import {
	editableMember,
	midMonthOpenings,
} from "@/features/scheduling/hours/fixtures";
import { firstWeek } from "@/features/scheduling/startingContext/fixtures";
import {
	StartingContextSection,
	type StartingPointDialog,
} from "@/features/scheduling/startingContext/StartingContextSection";

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

const show = (
	openOnStart?: StartingPointDialog,
	showsHours?: boolean,
	daysBefore?: { from: string; to: string },
	onOpenedOnStart?: () => void
): void => {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	render(
		<I18nextProvider i18n={authTestI18n}>
			<QueryClientProvider client={client}>
				<StartingContextSection
					canEdit
					companyId="c-1"
					daysBefore={daysBefore}
					nonWorkingDayTypes={[]}
					openOnStart={openOnStart}
					scheduleId="s-1"
					showsHours={showsHours}
					unit={UNIT}
					onOpenedOnStart={onOpenedOnStart}
				/>
			</QueryClientProvider>
		</I18nextProvider>
	);
};

const reads = {
	[`GET ${SCHEDULE}/starting-days`]: {
		status: 200,
		body: envelope(firstWeek()),
	},
	[`GET ${SCHEDULE}/opening-balances`]: {
		status: 200,
		body: envelope(midMonthOpenings([editableMember("p-tan")])),
	},
};

describe("StartingContextSection", () => {
	it("given_aDraftStartingMidMonth_when_shown_then_lastWeekAndTheHoursWorkedThisMonthAreTwoLines", async () => {
		stubApi(reads);
		show();

		expect(await screen.findByText(/No roster before this week/)).toBeVisible();
		expect(
			await screen.findByText(
				"Hours worked before Nov 9 are unknown for 1 person."
			)
		).toBeVisible();
		expect(
			screen.getByRole("button", { name: "Edit last week’s shifts" })
		).toBeVisible();
		expect(screen.getByRole("button", { name: "Add them" })).toBeVisible();
	});

	it("given_aDraft_when_shown_then_saysShiftsRosteredInTheDaysAfterStayAsTheyAre", async () => {
		stubApi(reads);
		show();

		expect(
			await screen.findByText(
				"Shifts already rostered in the 7 days after this schedule stay as they are; nobody is given a shift here that leaves too little rest before them."
			)
		).toBeVisible();
	});

	it("given_showsHoursFalse_when_shown_then_onlyTheDaysBeforeTheWeek", async () => {
		const calls = stubApi(reads);
		show(undefined, false);

		expect(await screen.findByText(/No roster before this week/)).toBeVisible();
		expect(screen.queryByRole("button", { name: "Add them" })).toBeNull();
		expect(
			calls.some((call) => call.path === `${SCHEDULE}/opening-balances`)
		).toBe(false);
	});

	it("given_daysBeforeTheFirstGeneratedDay_when_shown_then_theNoticeNamesThoseStillUnknown", async () => {
		stubApi(reads);
		show(undefined, false, { from: "2026-11-07", to: "2026-11-08" });

		expect(
			await screen.findByText(
				"Still unknown for some people: Sat, Nov 7 and Sun, Nov 8. Left unknown, they count as days worked."
			)
		).toBeVisible();
	});

	it("given_openOnStartDays_when_theDraftIsRead_then_theGridOfDaysOpens", async () => {
		stubApi(reads);
		show("days");

		expect(
			await screen.findByRole("dialog", { name: "Before this week" })
		).toBeVisible();
	});

	it("given_openOnStart_when_theDialogOpens_then_theCallerIsToldOnceSoItNeverOpensByItselfAgain", async () => {
		stubApi(reads);
		const onOpenedOnStart = vi.fn();
		show("days", undefined, undefined, onOpenedOnStart);

		await screen.findByRole("dialog", { name: "Before this week" });
		await vi.waitFor(() => {
			expect(onOpenedOnStart).toHaveBeenCalledTimes(1);
		});
	});

	it("given_openOnStartHours_when_theDraftIsRead_then_theHoursOpen", async () => {
		stubApi(reads);
		show("hours");

		expect(
			await screen.findByRole("dialog", {
				name: "Hours already worked this month (Nov 1 to Nov 8)",
			})
		).toBeVisible();
	});

	it("given_daysSaved_when_saved_then_onlyTheDaysArePut", async () => {
		const calls = stubApi({
			...reads,
			[`PUT ${SCHEDULE}/starting-days`]: {
				status: 200,
				body: envelope(firstWeek()),
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
