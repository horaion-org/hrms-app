import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, beforeEach, expect, it, vi } from "vitest";
import { resetApiClient } from "@/common/api-client";
import {
	currentUserReply,
	openApp,
	type OpenedApp,
} from "@/common/testing/openApp";
import {
	accessPassReply,
	envelope,
	problemReply,
	stubApi,
	type StubReply,
} from "@/common/testing/stubApi";
import { endSession } from "@/features/auth/session";
import { renderAuthApp } from "@/features/auth/testing";
import {
	monthWeekFixture,
	scheduleMonthFixture,
} from "@/features/scheduling/months/fixtures";
import {
	generatedScheduleFixture,
	scheduleAssignmentsFixture,
	schedulingWorkspace,
} from "@/features/scheduling/schedules/fixtures";

/**
 * A withdrawn roster's "Regenerate this week" (API ADR-0134): it posts the
 * schedule's own regeneration route, never the month run, after a confirm
 * that says staff saw it. A never-published roster still posts the month run
 * (ScheduleDetail.test's "regenerates this week over its hand changes").
 */

/** Wednesday of the fixtures' week in their Singapore branch: the week has not passed. */
const IN_THE_FIXTURE_WEEK = new Date("2026-10-14T09:00:00+08:00");
const SCHEDULE =
	"/api/v1/companies/c-1/branches/b-1/departments/d-1/schedules/s-1";
const SCHEDULE_READ = "/api/v1/companies/c-1/schedules/s-1";
const ASSIGNMENTS = `${SCHEDULE}/assignments`;
const REGENERATION = `${SCHEDULE}/regeneration`;
const OCTOBER_MONTH = "/api/v1/companies/c-1/schedule-months/2026-10";
const OCTOBER_GENERATION = `${OCTOBER_MONTH}/generation`;
const MENU = "More actions for Front Office - Week 42";
const WITHDRAWN_AT = "2026-10-13T09:00:00Z";

type Calls = ReturnType<typeof stubApi>;

beforeAll(async () => {
	await import("@/pages/ScheduleDetail");
});
let app: OpenedApp | undefined;
beforeEach(() => {
	vi.useFakeTimers({ toFake: ["Date"], now: IN_THE_FIXTURE_WEEK });
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

const ok = (data: unknown): StubReply => ({
	status: 200,
	body: envelope(data),
});

/** Opens schedule s-1, withdrawn and then `status`, for a manager who may generate; the regeneration answers `regenerationReply`. */
const openWithdrawnRoster = async (
	status: "GENERATED" | "REJECTED",
	regenerationReply: StubReply
): Promise<Calls> => {
	vi.spyOn(window, "scrollTo").mockImplementation(() => {});
	const calls = stubApi({
		"POST /api/v1/public/sessions/refreshes": accessPassReply(),
		"GET /api/v1/me": currentUserReply(),
		"GET /api/v1/me/workspace": {
			status: 200,
			body: envelope(
				schedulingWorkspace(["schedule:read", "schedule:generate"])
			),
		},
		[`GET ${SCHEDULE_READ}`]: [
			ok(
				generatedScheduleFixture({
					status,
					publicationWithdrawnAt: WITHDRAWN_AT,
				})
			),
			ok(generatedScheduleFixture({ status: "GENERATION_REQUESTED" })),
		],
		[`GET ${ASSIGNMENTS}`]: ok(scheduleAssignmentsFixture()),
		[`GET ${OCTOBER_MONTH}`]: ok(
			scheduleMonthFixture({
				month: "2026-10",
				departmentName: "Front Office",
				weeks: [
					monthWeekFixture({
						periodStart: "2026-10-12",
						periodEnd: "2026-10-18",
						state: "TO_REVIEW",
						scheduleId: "s-1",
					}),
				],
			})
		),
		[`POST ${REGENERATION}`]: regenerationReply,
	});
	app = await openApp("/scheduling/s-1");
	renderAuthApp(app);
	return calls;
};

const postsOf = (calls: Calls, path: string): Calls =>
	calls.filter((call) => call.method === "POST" && call.path === path);

it("regenerates a withdrawn roster through its own route after saying staff saw it", async () => {
	const calls = await openWithdrawnRoster(
		"GENERATED",
		ok(generatedScheduleFixture({ status: "GENERATION_REQUESTED" }))
	);
	const user = userEvent.setup();

	await user.click(await screen.findByRole("button", { name: MENU }));
	await user.click(
		screen.getByRole("menuitem", { name: "Regenerate this week" })
	);
	const dialog = screen.getByRole("dialog", {
		name: "Generate this published roster again?",
	});
	expect(dialog).toHaveTextContent(
		"Staff saw this roster while it was published."
	);
	expect(dialog).toHaveTextContent(
		"Every shift may change, and every change made by hand since is replaced."
	);
	expect(dialog).toHaveTextContent(
		"Publish the new roster again for staff to see it."
	);
	await user.click(
		within(dialog).getByRole("button", { name: "Generate again" })
	);

	expect(await screen.findByRole("note")).toHaveTextContent(
		"This schedule is being generated."
	);
	expect(postsOf(calls, REGENERATION)).toHaveLength(1);
	expect(postsOf(calls, OCTOBER_GENERATION)).toHaveLength(0);
});

it("offers a rejected withdrawn roster its regeneration and says why the API refused it", async () => {
	const calls = await openWithdrawnRoster(
		"REJECTED",
		problemReply(409, "SCHEDULE_ONCE_PUBLISHED")
	);
	const user = userEvent.setup();

	// A rejected roster offers it as the header's next step.
	await user.click(
		await screen.findByRole("button", { name: "Regenerate this week" })
	);
	const dialog = screen.getByRole("dialog", {
		name: "Generate this published roster again?",
	});
	await user.click(
		within(dialog).getByRole("button", { name: "Generate again" })
	);

	expect(
		await within(dialog).findByText(
			"Staff were told of changes to this roster while it was published, so it can’t be generated again. Correct it with roster changes, or delete it and schedule its days again."
		)
	).toBeInTheDocument();
	expect(postsOf(calls, REGENERATION)).toHaveLength(1);
	expect(postsOf(calls, OCTOBER_GENERATION)).toHaveLength(0);
});
