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
import type { WeekPart } from "@/features/scheduling/months/api";
import {
	monthWeekFixture,
	scheduleMonthFixture,
} from "@/features/scheduling/months/fixtures";
import type { Schedule } from "@/features/scheduling/schedules/api";
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

/**
 * Opens schedule s-1 of the week of 12 Oct 2026 as `shown` says, for a
 * manager who may generate, with the week's `parts`; the regeneration
 * answers `regenerationReply`.
 */
const openRoster = async ({
	shown,
	parts = [],
	regenerationReply = ok(
		generatedScheduleFixture({ status: "GENERATION_REQUESTED" })
	),
}: {
	shown: Partial<Schedule>;
	parts?: Array<WeekPart>;
	regenerationReply?: StubReply;
}): Promise<Calls> => {
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
			ok(generatedScheduleFixture(shown)),
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
						parts,
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
	const calls = await openRoster({
		shown: { status: "GENERATED", publicationWithdrawnAt: WITHDRAWN_AT },
	});
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
	const calls = await openRoster({
		shown: { status: "REJECTED", publicationWithdrawnAt: WITHDRAWN_AT },
		regenerationReply: problemReply(409, "SCHEDULE_ONCE_PUBLISHED"),
	});
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
			"Staff were told of changes to this roster while it was published, so it can’t be generated again here. Correct it with roster changes, or choose its days on the Generate page: a new roster is worked out and this one is kept."
		)
	).toBeInTheDocument();
	expect(postsOf(calls, REGENERATION)).toHaveLength(1);
	expect(postsOf(calls, OCTOBER_GENERATION)).toHaveLength(0);
});

/** One part of the week of 12 Oct 2026, to review unless `overrides` say. */
const part = (overrides: Partial<WeekPart>): WeekPart => ({
	scheduleId: "s-1",
	name: "Front Office - Week 42",
	named: false,
	coveredFrom: "2026-10-12",
	coveredTo: "2026-10-18",
	state: "TO_REVIEW",
	redoing: false,
	...overrides,
});

/** The week in three parts: Mon–Tue (s-0), Wed–Fri (s-1, on screen), Sat–Sun (s-2) in `lastState`. */
const threeParts = (lastState: WeekPart["state"]): Array<WeekPart> => [
	part({
		scheduleId: "s-0",
		coveredFrom: "2026-10-12",
		coveredTo: "2026-10-13",
	}),
	part({
		scheduleId: "s-1",
		coveredFrom: "2026-10-14",
		coveredTo: "2026-10-16",
	}),
	part({
		scheduleId: "s-2",
		coveredFrom: "2026-10-17",
		coveredTo: "2026-10-18",
		state: lastState,
	}),
];
/** A part's "More actions" menu, named by its days. */
const PART_MENU = /^More actions for Oct 14/;
const WEDNESDAY_TO_FRIDAY = {
	coveredFrom: "2026-10-14",
	coveredTo: "2026-10-16",
};

// A part regenerates its own days through its own route, never the month run (API ADR-0135).
it("regenerates the part pressed through its own route and says the later part follows", async () => {
	const calls = await openRoster({
		shown: { status: "GENERATED", ...WEDNESDAY_TO_FRIDAY },
		parts: threeParts("TO_REVIEW"),
	});
	const user = userEvent.setup();

	await user.click(await screen.findByRole("button", { name: PART_MENU }));
	expect(
		screen.queryByRole("menuitem", { name: "Regenerate this week" })
	).toBeNull();
	await user.click(
		screen.getByRole("menuitem", { name: "Regenerate these days" })
	);
	const dialog = screen.getByRole("dialog", {
		name: "Generate these days again?",
	});
	expect(dialog).toHaveTextContent(
		/Oct 14\s?–\s?16, 2026 are worked out again\. The current roster stays until the new one is ready\./
	);
	expect(dialog).toHaveTextContent(
		/Oct 17\s?–\s?18, 2026 were worked out from these days, so they are generated again after them\./
	);
	expect(dialog).not.toHaveTextContent("Staff saw this roster");
	await user.click(
		within(dialog).getByRole("button", { name: "Generate again" })
	);

	expect(await screen.findByRole("note")).toHaveTextContent(
		"This schedule is being generated."
	);
	expect(postsOf(calls, REGENERATION)).toHaveLength(1);
	expect(postsOf(calls, OCTOBER_GENERATION)).toHaveLength(0);
});

it("offers no regeneration of a part whose later part is published, and says why", async () => {
	await openRoster({
		shown: { status: "GENERATED", ...WEDNESDAY_TO_FRIDAY },
		parts: threeParts("PUBLISHED"),
	});
	const user = userEvent.setup();

	expect(
		await screen.findByText(
			"A later schedule of this week is published, or was published and withdrawn, and it was worked out from these days, so this one can’t be generated again. Change its roster by hand, or choose these days on the Generate page."
		)
	).toBeInTheDocument();
	await user.click(await screen.findByRole("button", { name: PART_MENU }));
	expect(
		screen.queryByRole("menuitem", { name: "Regenerate these days" })
	).toBeNull();
});
