import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { resetApiClient } from "@/common/api-client";
import {
	currentUserReply,
	openApp,
	type OpenedApp,
} from "@/common/testing/openApp";
import {
	accessPassReply,
	envelope,
	stubApi,
	type StubReply,
} from "@/common/testing/stubApi";
import { endSession } from "@/features/auth/session";
import { renderAuthApp } from "@/features/auth/testing";
import {
	CONSTRAINT_FIXTURES,
	CONSTRAINT_OPTIONS_RESPONSE,
} from "@/features/scheduling/constraints/fixtures";
import type { DatesPlan } from "@/features/scheduling/dates/api";
import {
	datesGenerationFixture,
	datesPlanFixture,
} from "@/features/scheduling/dates/fixtures";
import {
	monthGenerationCheckFixture,
	ungeneratedMonthFixture,
} from "@/features/scheduling/months/fixtures";
import { readinessFixture } from "@/features/scheduling/readiness/fixtures";
import { schedulingWorkspace } from "@/features/scheduling/schedules/fixtures";
import {
	SHIFT_FIXTURES,
	departmentShiftFixture,
} from "@/features/scheduling/shifts/fixtures";

/**
 * The Generate page asks before a run by dates replaces a roster to review
 * (the owner's case: a roster published, withdrawn, then its days chosen
 * again). A run over empty days posts at once (CreateMonthSchedule.test's
 * "by dates" cases).
 */

vi.setConfig({ testTimeout: 15_000 });

const COMPANY = "/api/v1/companies/c-1";
const DEPARTMENT = `${COMPANY}/branches/b-1/departments/d-1`;
const DECEMBER = `${COMPANY}/schedule-months/2026-12`;
const NOVEMBER = `${COMPANY}/schedule-months/2026-11`;
const GENERATION = `${COMPANY}/schedule-dates/generation`;
const REST_OF_THE_WEEK =
	"/scheduling/new?department=d-1&month=2026-12&for=dates&firstDay=2026-11-19&lastDay=2026-11-22";
const PERMISSIONS = [
	"schedule:read",
	"schedule:create",
	"schedule:update",
	"schedule:generate",
	"shift:read",
	"constraint:read",
];

type Calls = ReturnType<typeof stubApi>;

const reply = (data: unknown): StubReply => ({
	status: 200,
	body: envelope(data),
});

let app: OpenedApp | undefined;
beforeEach(() => {
	vi.spyOn(window, "scrollTo").mockImplementation(() => {});
	// Thursday 12 Nov 2026, the week before the days asked.
	vi.useFakeTimers({ toFake: ["Date"], now: new Date(2026, 10, 12) });
});
afterEach(() => {
	app?.disconnect();
	app?.queryClient.clear();
	app = undefined;
	endSession("expired");
	resetApiClient();
	vi.useRealTimers();
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
	localStorage.clear();
});

/**
 * Thu 19 – Sun 22 Nov asked, held by schedule s-1: published, then
 * withdrawn, with one day changed by hand. The API lists it to redo.
 */
const withdrawnPlan = (): DatesPlan => {
	const [week] = datesPlanFixture().weeks;
	return datesPlanFixture({
		lastDay: "2026-11-22",
		newDays: 4,
		weeks: [
			{
				...week!,
				redone: [
					{
						scheduleId: "s-1",
						coveredFrom: "2026-11-19",
						coveredTo: "2026-11-22",
						state: "TO_REVIEW",
						handChangedDays: 1,
						publishedOnce: true,
					},
				],
			},
		],
	});
};

/** Opens the Generate page on Thu 19 – Sun 22 Nov for a manager who may generate, with `plan` as the API's answer. */
const openDates = async (plan: DatesPlan): Promise<Calls> => {
	const calls = stubApi({
		"POST /api/v1/public/sessions/refreshes": accessPassReply(),
		"GET /api/v1/me": currentUserReply(),
		"GET /api/v1/me/workspace": reply(schedulingWorkspace(PERMISSIONS)),
		[`GET ${COMPANY}/scheduling-readiness`]: reply([
			readinessFixture({ departmentName: "Front Office" }),
		]),
		[`GET ${DECEMBER}`]: reply(ungeneratedMonthFixture()),
		[`GET ${NOVEMBER}/generation-check`]: reply(
			monthGenerationCheckFixture({ month: "2026-11" })
		),
		[`GET ${DEPARTMENT}/shifts`]: reply(
			SHIFT_FIXTURES.map((shift) => departmentShiftFixture(shift))
		),
		[`GET ${DEPARTMENT}/constraints`]: reply(CONSTRAINT_FIXTURES),
		[`GET ${DEPARTMENT}/constraint-options`]: reply(
			CONSTRAINT_OPTIONS_RESPONSE
		),
		[`GET ${COMPANY}/schedule-dates/plan`]: reply(plan),
		[`POST ${GENERATION}`]: reply(datesGenerationFixture()),
	});
	app = await openApp(REST_OF_THE_WEEK);
	renderAuthApp(app);
	return calls;
};

/** The dates generations posted so far. */
const postsOf = (calls: Calls): Calls =>
	calls.filter((call) => call.method === "POST" && call.path === GENERATION);

/** From Setup to the Generate step, and clicks its Generate button. */
const clickGenerate = async (
	user: ReturnType<typeof userEvent.setup>
): Promise<void> => {
	const generate = await screen.findByRole("button", { name: /^Generate / });
	await vi.waitFor(() => {
		expect(generate).toBeEnabled();
	});
	await user.click(generate);
};

it("given_aWithdrawnRosterOnTheDays_when_generating_then_asksBeforeReplacingAndPostsOnlyOnceConfirmed", async () => {
	const user = userEvent.setup();
	const calls = await openDates(withdrawnPlan());

	// Setup says the days are to review, never that they are published.
	expect(
		await screen.findByText(
			/^Nov 19\s?–\s?22, 2026: to review, will be worked out again\.$/
		)
	).toBeInTheDocument();
	expect(screen.queryByText(/published and stay/)).toBeNull();
	const next = screen.getByRole("button", { name: "Next" });
	await vi.waitFor(() => {
		expect(next).toBeEnabled();
	});
	await user.click(next);
	// The Forecast step is optional: Next goes on with nothing entered.
	await screen.findByRole("region", { name: "Staffing forecast" });
	await user.click(screen.getByRole("button", { name: "Next" }));

	await clickGenerate(user);
	const dialog = await screen.findByRole("dialog", {
		name: "Replace the roster to review?",
	});
	expect(dialog).toHaveTextContent(
		/There is a roster to review on Nov 19\s?–\s?22, 2026\. Generating works these days out again and replaces it\./
	);
	expect(
		within(dialog)
			.getAllByRole("listitem")
			.map((item) => item.textContent)
	).toEqual([
		expect.stringMatching(
			/^Staff saw the roster for Nov 19\s?–\s?22, 2026 while it was published\.$/
		),
		"Publish the new roster for staff to see it.",
		"1 change made by hand will be replaced.",
		"Published days stay as they are.",
	]);
	expect(postsOf(calls)).toHaveLength(0);

	// Cancel leaves the roster as it is.
	await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
	expect(screen.queryByRole("dialog")).toBeNull();
	expect(postsOf(calls)).toHaveLength(0);

	await clickGenerate(user);
	await user.click(
		await screen.findByRole("button", { name: "Generate and replace" })
	);
	await vi.waitFor(() => {
		expect(postsOf(calls)).toHaveLength(1);
	});
	expect(postsOf(calls)[0]?.body).toMatchObject({
		firstDay: "2026-11-19",
		lastDay: "2026-11-22",
	});
});
