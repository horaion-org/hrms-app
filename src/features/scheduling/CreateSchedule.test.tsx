import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetApiClient } from "@/common/api-client";
import {
	currentUserReply,
	openApp,
	settled,
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
import { readinessFixture } from "@/features/scheduling/readiness/fixtures";
import {
	CONSTRAINT_FIXTURES,
	CONSTRAINT_OPTIONS_RESPONSE,
	INCLUDED_CONSTRAINT_IDS,
	frozenConstraintsFixture,
} from "@/features/scheduling/constraints/fixtures";
import {
	generatedScheduleFixture,
	scheduleFixture,
	schedulingWorkspace,
	twoBranchSchedulingWorkspace,
} from "@/features/scheduling/schedules/fixtures";
import {
	INCLUDED_SHIFT_IDS,
	SHIFT_FIXTURES,
	SHIFT_ROLE_OPTIONS,
	departmentShiftFixture,
	frozenShiftsFixture,
	scheduleShiftsFixture,
} from "@/features/scheduling/shifts/fixtures";
import type { StartingDays } from "@/features/scheduling/startingContext/api";
import {
	firstWeek,
	unknownCell,
} from "@/features/scheduling/startingContext/fixtures";
import type { Workspace } from "@/features/workspace/api";
import { Route as createScheduleRoute } from "@/routes/_authenticated._app.scheduling_.new";

// Under load (Maven build alongside, shared CI runner) this file timed out at the 5 s default.
vi.setConfig({ testTimeout: 15_000 });

const REFRESH = "POST /api/v1/public/sessions/refreshes";
const ME = "GET /api/v1/me";
const WORKSPACE = "GET /api/v1/me/workspace";
const DEPARTMENT = "/api/v1/companies/c-1/branches/b-1/departments/d-1";
const SCHEDULES = `${DEPARTMENT}/schedules`;
const SCHEDULE = `${SCHEDULES}/s-1`;
const SCHEDULE_SHIFTS = `${SCHEDULE}/shifts`;
const GENERATION = `${SCHEDULE}/generation`;
const LIVE_SHIFTS = `${DEPARTMENT}/shifts`;
const ROLE_OPTIONS = `${DEPARTMENT}/shift-role-options`;
const SCHEDULE_CONSTRAINTS = `${SCHEDULE}/constraints`;
const LIVE_CONSTRAINTS = `${DEPARTMENT}/constraints`;
const CONSTRAINT_OPTIONS_PATH = `${DEPARTMENT}/constraint-options`;
const ALL = [
	"schedule:read",
	"schedule:create",
	"schedule:update",
	"schedule:generate",
	"shift:read",
	"shift:create",
	"shift:update",
	"shift:delete",
	"constraint:read",
	"constraint:create",
	"constraint:update",
	"constraint:delete",
];
const DRAFT = scheduleFixture();
const DRAFT_SHIFTS = scheduleShiftsFixture();
/** A reopened draft lands here. */
const REOPEN = "/scheduling/new?step=forecast&scheduleId=s-1&departmentId=d-1";
const DRAFT_SETUP = {
	name: "Front Office - Week 42",
	periodStart: "2026-10-12",
	includeLeave: true,
	allowOpenShifts: false,
};

/** Front Office's live shifts as a new draft lists them: every shift its active constraints name. */
const LIVE_SHIFT_ROWS = [
	"front-desk-am",
	"breakfast-prep",
	"lunch-rush",
	"closing-crew",
].map((shiftId) =>
	departmentShiftFixture(
		SHIFT_FIXTURES.find((shift) => shift.shiftId === shiftId)
	)
);
/** Front Office's ACTIVE constraints, as everything chosen ticks them. */
const ACTIVE_CONSTRAINT_IDS = CONSTRAINT_FIXTURES.filter(
	(constraint) => constraint.status === "ACTIVE"
).map((constraint) => constraint.constraintId);
const WEEK_LINE = "Uses all 4 shifts and 5 constraints of Front Office.";

type Call = { method: string; path: string; search: string; body: unknown };

let app: OpenedApp | undefined;
beforeEach(() => {
	vi.spyOn(window, "scrollTo").mockImplementation(() => {});
});
afterEach(() => {
	app?.disconnect();
	app?.queryClient.clear();
	app = undefined;
	endSession("expired");
	resetApiClient();
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
	localStorage.clear();
});

const reply = (data: unknown, status = 200): StubReply => ({
	status,
	body: envelope(data),
});

/** The workspace granting `permissions` company-wide, or exactly as given. */
const workspaceOf = (permissions: Array<string> | Workspace): StubReply =>
	reply(
		Array.isArray(permissions) ? schedulingWorkspace(permissions) : permissions
	);

const routes = (
	permissions: Array<string> | Workspace = ALL
): Record<string, StubReply> => ({
	[REFRESH]: accessPassReply(),
	[ME]: currentUserReply(),
	[WORKSPACE]: workspaceOf(permissions),
	[`GET ${SCHEDULE}`]: reply(DRAFT),
	[`GET ${SCHEDULE_SHIFTS}`]: reply(DRAFT_SHIFTS),
	[`GET ${ROLE_OPTIONS}`]: reply(SHIFT_ROLE_OPTIONS),
	[`GET ${LIVE_CONSTRAINTS}`]: reply(CONSTRAINT_FIXTURES),
	[`GET ${CONSTRAINT_OPTIONS_PATH}`]: reply(CONSTRAINT_OPTIONS_RESPONSE),
});

const open = async (
	entry: string,
	extra: Record<string, StubReply | Array<StubReply>> = {},
	permissions: Array<string> | Workspace = ALL
): Promise<{ opened: OpenedApp; calls: Array<Call> }> => {
	const calls = stubApi({ ...routes(permissions), ...extra });
	app = await openApp(entry);
	renderAuthApp(app);
	return { opened: app, calls };
};

/** Opens the saved draft s-1 on its Forecast step, once its step is shown. */
const reopen = async (
	extra: Record<string, StubReply | Array<StubReply>> = {},
	permissions: Array<string> | Workspace = ALL,
	entry = REOPEN
): Promise<{ opened: OpenedApp; calls: Array<Call> }> => {
	const opened = await open(entry, extra, permissions);
	await screen.findByRole("region", { name: "Staffing forecast" });
	return opened;
};

const sent = (calls: Array<Call>, route: string): Array<unknown> =>
	calls
		.filter((call) => `${call.method} ${call.path}` === route)
		.map((call) => call.body);

const writes = (calls: Array<Call>): Array<string> =>
	calls
		.filter(
			(call) =>
				call.method !== "GET" &&
				call.path !== "/api/v1/public/sessions/refreshes"
		)
		.map((call) => `${call.method} ${call.path}`);

const next = (): HTMLElement => screen.getByRole("button", { name: "Next" });

const checkbox = (name: string): HTMLElement =>
	screen.getByRole("checkbox", { name: `Select ${name}` });

/** Clicks Next from Forecast until the Generate step is shown. */
const toGenerate = async (
	user: ReturnType<typeof userEvent.setup>
): Promise<void> => {
	await user.click(next());
	await screen.findByRole("region", { name: "Ready to generate" });
};

const fillSetup = async (
	user: ReturnType<typeof userEvent.setup>
): Promise<void> => {
	await user.click(await screen.findByRole("button", { name: /Department/ }));
	await user.click(await screen.findByRole("option", { name: "Front Office" }));
	await user.type(
		screen.getByRole("textbox", { name: /Schedule name/ }),
		"Front Office - Week 42"
	);
};

/** Grants each key only at the Department it names, as a Department-level role would. */
const grantedAt = (grants: Record<string, Array<string>>): Workspace => {
	const workspace = schedulingWorkspace([]);
	for (const branch of workspace.companies[0]?.branches ?? [])
		for (const department of branch.departments)
			department.permissions.push(...(grants[department.uuid] ?? []));
	return workspace;
};

describe("Create Schedule: the URL", () => {
	/** The route's own search validator, as the router runs it. */
	const parseCreateScheduleSearch = (
		search: Record<string, unknown>
	): unknown => {
		const validate = createScheduleRoute.options.validateSearch;
		if (typeof validate !== "function") throw new Error("No validator");
		return validate(search);
	};

	it("given_aDepartmentAndWeekToPreFill_when_parsed_then_keepsThem", () => {
		expect(
			parseCreateScheduleSearch({ department: "d-1", week: "2026-11-16" })
		).toEqual({
			department: "d-1",
			week: "2026-11-16",
		});
	});

	it("given_aMalformedDepartmentOrWeek_when_parsed_then_dropsThem", () => {
		expect(
			parseCreateScheduleSearch({ department: "", week: "16-11" })
		).toEqual({});
	});
});

describe("Create Schedule: opening and setup", () => {
	it("given_theSchedulingOverview_when_createClicked_then_opensSetup", async () => {
		const user = userEvent.setup();
		const { opened } = await open("/scheduling");

		await user.click(
			await screen.findByRole("link", { name: "Create schedule" })
		);
		// The shell's first navigation into the wizard outlasts the default wait.
		expect(
			await screen.findByRole(
				"heading",
				{ level: 1, name: "Create schedule" },
				{ timeout: 10_000 }
			)
		).toBeVisible();
		await settled(opened.router);

		expect(opened.router.state.location.pathname).toBe("/scheduling/new");
		expect(
			screen.getByRole("region", { name: "Schedule setup" })
		).toBeVisible();
		expect(
			screen.getByRole("link", { name: "Back to overview" })
		).toHaveAttribute("href", "/scheduling");
	});

	it("given_noScheduleCreateAnywhere_when_onTheOverview_then_offersNoCreate", async () => {
		await open("/scheduling", {}, ["schedule:read"]);

		expect(
			await screen.findByRole("heading", {
				level: 1,
				name: "Scheduling",
			})
		).toBeVisible();
		expect(screen.queryByRole("link", { name: "Create schedule" })).toBeNull();
	});

	it("given_aLaterStepWithoutADraft_when_linkedTo_then_returnsToSetup", async () => {
		const { opened } = await open("/scheduling/new?step=forecast");

		expect(
			await screen.findByRole("region", { name: "Schedule setup" })
		).toBeVisible();
		await settled(opened.router);
		expect(opened.router.state.location.search).toEqual({ step: "setup" });
	});

	it("given_aScheduleIdWithoutItsDepartment_when_linkedTo_then_returnsToSetup", async () => {
		const { opened, calls } = await open(
			"/scheduling/new?step=forecast&scheduleId=s-1"
		);

		expect(
			await screen.findByRole("region", { name: "Schedule setup" })
		).toBeVisible();
		await settled(opened.router);
		expect(opened.router.state.location.search).toEqual({ step: "setup" });
		expect(calls.filter((call) => call.path === SCHEDULE)).toEqual([]);
	});

	it("given_aCompletedSetup_when_nextClicked_then_createsTheDraftAtTheChosenDepartmentAndOpensItsForecast", async () => {
		const user = userEvent.setup();
		const created = scheduleFixture({
			includedShiftIds: [],
			includedConstraintIds: [],
		});
		const { opened, calls } = await open("/scheduling/new", {
			[`POST ${SCHEDULES}`]: reply(created, 201),
			[`GET ${SCHEDULE}`]: reply(created),
			[`GET ${SCHEDULE_SHIFTS}`]: reply([]),
			[`GET ${LIVE_SHIFTS}`]: reply(LIVE_SHIFT_ROWS),
		});

		await fillSetup(user);
		await screen.findByText(WEEK_LINE);
		await user.click(next());

		await screen.findByRole("region", { name: "Staffing forecast" });
		expect(opened.router.state.location.search).toEqual({
			step: "forecast",
			scheduleId: "s-1",
			departmentId: "d-1",
		});
		expect(sent(calls, `POST ${SCHEDULES}`)).toEqual([
			{
				...DRAFT_SETUP,
				periodStart: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) as string,
				// A new draft uses everything until its week is chosen.
				includedShiftIds: LIVE_SHIFT_ROWS.map((shift) => shift.shiftId),
				includedConstraintIds: ACTIVE_CONSTRAINT_IDS,
			},
		]);
	});

	it("given_aRefusedPeriod_when_setupCompleted_then_saysSoOnThePeriod", async () => {
		const user = userEvent.setup();
		const { opened } = await open("/scheduling/new", {
			[`POST ${SCHEDULES}`]: problemReply(400, "SCHEDULE_PERIOD_NOT_MONDAY"),
			[`GET ${LIVE_SHIFTS}`]: reply(LIVE_SHIFT_ROWS),
		});

		await fillSetup(user);
		await screen.findByText(WEEK_LINE);
		await user.click(next());

		expect(
			await screen.findByText("Choose a period that starts on a Monday.")
		).toBeVisible();
		expect(opened.router.state.location.search).toEqual({});
	});

	it("given_aSavedDraft_when_setupCompletedAgain_then_replacesItsSetupKeepingItsTicks", async () => {
		const user = userEvent.setup();
		const { opened, calls } = await open(
			"/scheduling/new?step=setup&scheduleId=s-1&departmentId=d-1",
			{ [`PUT ${SCHEDULE}`]: reply(DRAFT) }
		);
		const name = await screen.findByRole("textbox", { name: /Schedule name/ });

		await user.clear(name);
		await user.type(name, "Front Office - Late Week");
		await user.click(next());

		await screen.findByRole("region", { name: "Staffing forecast" });
		expect(opened.router.state.location.search).toEqual({
			step: "forecast",
			scheduleId: "s-1",
			departmentId: "d-1",
		});
		expect(sent(calls, `PUT ${SCHEDULE}`)).toEqual([
			{
				...DRAFT_SETUP,
				name: "Front Office - Late Week",
				includedShiftIds: INCLUDED_SHIFT_IDS,
				includedConstraintIds: INCLUDED_CONSTRAINT_IDS,
			},
		]);
		expect(sent(calls, `POST ${SCHEDULES}`)).toEqual([]);
	});
});

describe("Create Schedule: the week's choice", () => {
	const SETUP_OF_S1 =
		"/scheduling/new?step=setup&scheduleId=s-1&departmentId=d-1";
	const weekLine = (text: string): Promise<HTMLElement> =>
		screen.findByText(text, { exact: false });

	it("given_aNewDraftsDepartment_when_chosen_then_saysItUsesEverything", async () => {
		const user = userEvent.setup();
		await open("/scheduling/new", {
			[`GET ${LIVE_SHIFTS}`]: reply(LIVE_SHIFT_ROWS),
		});

		await fillSetup(user);

		expect(await weekLine(WEEK_LINE)).toBeVisible();
		expect(
			screen.getByRole("button", { name: "Choose for this week" })
		).toBeVisible();
	});

	it("given_aShiftLeftOut_when_theWeekIsChosen_then_theLineCountsWhatIsUsedAndNextPostsIt", async () => {
		const user = userEvent.setup();
		const created = scheduleFixture();
		const { calls } = await open("/scheduling/new", {
			[`GET ${LIVE_SHIFTS}`]: reply(LIVE_SHIFT_ROWS),
			[`POST ${SCHEDULES}`]: reply(created, 201),
		});
		await fillSetup(user);
		await user.click(
			await screen.findByRole("button", { name: "Choose for this week" })
		);
		const dialog = await screen.findByRole("dialog", {
			name: /^What .+ uses$/,
		});

		await user.click(
			within(dialog).getByRole("checkbox", { name: "Select Lunch Rush" })
		);
		await user.click(
			within(dialog).getByRole("button", { name: "Use for week" })
		);

		expect(
			await weekLine(
				"Uses 3 of 4 shifts and 4 of 5 constraints of Front Office."
			)
		).toBeVisible();
		await user.click(next());
		await waitFor(() => {
			expect(sent(calls, `POST ${SCHEDULES}`)).toHaveLength(1);
		});
		expect(sent(calls, `POST ${SCHEDULES}`)[0]).toMatchObject({
			includedShiftIds: ["front-desk-am", "breakfast-prep", "closing-crew"],
			includedConstraintIds: ACTIVE_CONSTRAINT_IDS.filter(
				(constraintId) => constraintId !== "lunch-stand-ins"
			),
		});
	});

	it("given_aGeneratedSchedule_when_itsSetupIsViewed_then_saysWhatItWasGeneratedWithAndViewIsReadOnly", async () => {
		const user = userEvent.setup();
		await open(SETUP_OF_S1, {
			[`GET ${SCHEDULE}`]: reply(
				generatedScheduleFixture({ status: "GENERATED" })
			),
			[`GET ${SCHEDULE_SHIFTS}`]: reply(frozenShiftsFixture()),
			[`GET ${SCHEDULE_CONSTRAINTS}`]: reply(frozenConstraintsFixture()),
		});

		expect(
			await weekLine("Generated with 4 shifts and 3 constraints.")
		).toBeVisible();
		await user.click(screen.getByRole("button", { name: "View" }));

		const dialog = await screen.findByRole("dialog", {
			name: /^What .+ used$/,
		});
		expect(within(dialog).queryByRole("checkbox")).toBeNull();
		expect(
			within(dialog).queryByRole("button", { name: "Use for week" })
		).toBeNull();
	});

	it("given_theReadKeys_when_aDepartmentIsChosen_then_linksToEditItsShiftsAndConstraints", async () => {
		const user = userEvent.setup();
		await open("/scheduling/new", {
			[`GET ${LIVE_SHIFTS}`]: reply(LIVE_SHIFT_ROWS),
		});

		await fillSetup(user);

		expect(
			await screen.findByRole("link", { name: "Edit shifts" })
		).toHaveAttribute(
			"href",
			"/scheduling?view=shifts&branch=b-1&department=d-1"
		);
		expect(
			screen.getByRole("link", { name: "Edit constraints" })
		).toHaveAttribute(
			"href",
			"/scheduling?view=constraints&branch=b-1&department=d-1"
		);
	});

	it("given_aSavedDraft_when_onGenerate_then_linksToEditItsDepartment", async () => {
		await open("/scheduling/new?step=generate&scheduleId=s-1&departmentId=d-1");

		expect(
			await screen.findByRole("link", { name: "Edit constraints" })
		).toHaveAttribute(
			"href",
			"/scheduling?view=constraints&branch=b-1&department=d-1"
		);
		expect(screen.getByRole("link", { name: "Edit shifts" })).toBeVisible();
	});

	it("given_noShiftReadKey_when_aDepartmentIsChosen_then_leavesOutEditShifts", async () => {
		const user = userEvent.setup();
		await open("/scheduling/new", {}, [
			"schedule:read",
			"schedule:create",
			"constraint:read",
		]);

		await fillSetup(user);

		expect(
			await screen.findByRole("link", { name: "Edit constraints" })
		).toBeVisible();
		expect(screen.queryByRole("link", { name: "Edit shifts" })).toBeNull();
	});

	it("given_noConstraintReadKey_when_aDepartmentIsChosen_then_leavesOutEditConstraints", async () => {
		const user = userEvent.setup();
		await open("/scheduling/new", {}, [
			"schedule:read",
			"schedule:create",
			"shift:read",
		]);

		await fillSetup(user);

		expect(
			await screen.findByRole("link", { name: "Edit shifts" })
		).toBeVisible();
		expect(screen.queryByRole("link", { name: "Edit constraints" })).toBeNull();
	});

	it("given_listsThePersonMayNotRead_when_aDepartmentIsChosen_then_saysItUsesEverythingWithoutAChoice", async () => {
		const user = userEvent.setup();
		await open("/scheduling/new", {}, [
			"schedule:read",
			"schedule:create",
			"constraint:read",
		]);

		await fillSetup(user);

		expect(
			await weekLine(
				"This week uses every shift and constraint of Front Office."
			)
		).toBeVisible();
		expect(
			screen.queryByRole("button", { name: "Choose for this week" })
		).toBeNull();
	});
});

describe("Create Schedule: the Setup gate", () => {
	const READINESS = "GET /api/v1/companies/c-1/scheduling-readiness";
	const frontOffice = (
		missing: Array<"SHIFT" | "STAFFING_CONSTRAINT">
	): StubReply =>
		reply([
			readinessFixture({
				departmentName: "Front Office",
				branchName: "Main branch",
				ready: missing.length === 0,
				missing,
			}),
		]);
	const nextNote = (): string | null =>
		document.getElementById(next().getAttribute("aria-describedby") ?? "")
			?.textContent ?? null;

	it("given_nothingSetUp_when_theDepartmentIsChosen_then_stopsAndLinksToItsShiftsWithTheWayBack", async () => {
		const user = userEvent.setup();
		await open("/scheduling/new", {
			[`GET ${LIVE_SHIFTS}`]: reply([]),
			[`GET ${LIVE_CONSTRAINTS}`]: reply([]),
			[READINESS]: frontOffice(["SHIFT", "STAFFING_CONSTRAINT"]),
		});

		await fillSetup(user);

		expect(
			await screen.findByText(
				"Front Office has no shifts or staffing constraints yet. A schedule needs both.",
				{ exact: false }
			)
		).toBeVisible();
		expect(
			screen.getByRole("link", { name: "Set up Front Office" })
		).toHaveAttribute(
			"href",
			expect.stringMatching(
				/^\/scheduling\?view=shifts&branch=b-1&department=d-1&next=create&week=\d{4}-\d{2}-\d{2}$/
			) as string
		);
		expect(next()).toBeDisabled();
		expect(nextNote()).toBe(
			"Set up shifts and a staffing constraint for Front Office first."
		);
	});

	it("given_shiftsButNoStaffing_when_theDepartmentIsChosen_then_linksToItsConstraints", async () => {
		const user = userEvent.setup();
		await open("/scheduling/new", {
			[`GET ${LIVE_SHIFTS}`]: reply(LIVE_SHIFT_ROWS),
			[READINESS]: frontOffice(["STAFFING_CONSTRAINT"]),
		});

		await fillSetup(user);

		expect(
			await screen.findByRole("link", { name: "Add a staffing constraint" })
		).toHaveAttribute(
			"href",
			expect.stringMatching(
				/^\/scheduling\?view=constraints&branch=b-1&department=d-1&next=create&week=/
			) as string
		);
		expect(
			screen.getByText(
				"Front Office has shifts but no staffing constraint, so nobody would be rostered.",
				{ exact: false }
			)
		).toBeVisible();
		expect(next()).toBeDisabled();
	});

	it("given_someoneWhoCannotFixIt_when_theDepartmentIsChosen_then_saysWhoCanWithoutALink", async () => {
		const user = userEvent.setup();
		await open(
			"/scheduling/new",
			{
				[`GET ${LIVE_SHIFTS}`]: reply(LIVE_SHIFT_ROWS),
				[READINESS]: frontOffice(["STAFFING_CONSTRAINT"]),
			},
			["schedule:read", "schedule:create", "shift:read"]
		);

		await fillSetup(user);

		expect(
			await screen.findByText(
				"Front Office isn’t ready to schedule: it has no staffing constraint. Ask someone who manages Front Office’s scheduling to add one.",
				{ exact: false }
			)
		).toBeVisible();
		expect(screen.queryByRole("link", { name: "View constraints" })).toBeNull();
		expect(next()).toBeDisabled();
	});

	it("given_aReadyDepartment_when_chosen_then_showsNoGateAndNextGoesOn", async () => {
		const user = userEvent.setup();
		await open("/scheduling/new", {
			[`GET ${LIVE_SHIFTS}`]: reply(LIVE_SHIFT_ROWS),
			[READINESS]: frontOffice([]),
		});

		await fillSetup(user);

		await screen.findByText(WEEK_LINE);
		expect(
			screen.queryByText(/isn’t ready|has no shifts|no staffing/)
		).toBeNull();
		expect(next()).toBeEnabled();
	});

	it("given_listsThePersonMayNotSee_when_aDepartmentIsChosen_then_nextSaysWhy", async () => {
		const user = userEvent.setup();
		await open("/scheduling/new", {}, [
			"schedule:read",
			"schedule:create",
			"constraint:read",
		]);

		await fillSetup(user);

		await screen.findByText(
			"This week uses every shift and constraint of Front Office.",
			{ exact: false }
		);
		expect(next()).toBeDisabled();
		expect(nextNote()).toBe(
			"You need to see Front Office’s shifts and constraints to create its schedule."
		);
	});

	it("given_aListThatHasNotAnswered_when_aDepartmentIsChosen_then_nextWaitsWithoutANote", async () => {
		const user = userEvent.setup();
		// The department's live shifts fail to load, so the week isn't known.
		await open("/scheduling/new");

		await fillSetup(user);

		await waitFor(() => {
			expect(next()).toBeDisabled();
		});
		expect(nextNote()).toBe("");
	});
});

describe("Create Schedule: a reopened draft", () => {
	const SETUP_OF_S1 =
		"/scheduling/new?step=setup&scheduleId=s-1&departmentId=d-1";

	it("given_aGeneratedSchedule_when_itsSetupIsViewed_then_itIsTitledByItsNameAndReadsAsSetUp", async () => {
		await open(SETUP_OF_S1, {
			[`GET ${SCHEDULE}`]: reply(
				generatedScheduleFixture({ status: "GENERATED" })
			),
			[`GET ${SCHEDULE_SHIFTS}`]: reply(frozenShiftsFixture()),
			[`GET ${SCHEDULE_CONSTRAINTS}`]: reply(frozenConstraintsFixture()),
		});

		expect(
			await screen.findByRole("heading", {
				level: 1,
				name: DRAFT_SETUP.name,
			})
		).toBeVisible();
		expect(
			screen.queryByRole("heading", { level: 1, name: "Create schedule" })
		).toBeNull();
		expect(
			screen.getByText(
				"How this schedule was set up: its department, period, shifts and constraints."
			)
		).toBeVisible();
		expect(
			screen.getByText(
				"The department and scheduling period this schedule was set up for."
			)
		).toBeVisible();
		expect(
			screen.queryByText(
				"Select the department and scheduling period for your new schedule."
			)
		).toBeNull();
		expect(
			screen.getByRole("textbox", { name: /Schedule name/ })
		).toHaveAttribute("readonly");
	});

	it("given_aDraftThePersonMayChange_when_itsSetupIsOpened_then_itStaysTheCreateWizard", async () => {
		await open(SETUP_OF_S1);

		expect(
			await screen.findByRole("heading", {
				level: 1,
				name: "Create schedule",
			})
		).toBeVisible();
		expect(
			await screen.findByText(
				"Select the department and scheduling period for your new schedule."
			)
		).toBeVisible();
		expect(
			screen.getByRole("textbox", { name: /Schedule name/ })
		).not.toHaveAttribute("readonly");
	});

	it("given_aDraftsUrl_when_reopened_then_itsWeekListsItsShiftsTickedAsTheApiKeepsThem", async () => {
		const user = userEvent.setup();
		const { calls } = await open(SETUP_OF_S1);

		const department = await screen.findByRole("button", {
			name: /Department/,
		});
		expect(department).toHaveTextContent("Main branch › Front Office");
		expect(department).toBeDisabled();
		await user.click(
			await screen.findByRole("button", { name: "Choose for this week" })
		);
		const dialog = await screen.findByRole("dialog", {
			name: /^What .+ uses$/,
		});
		const table = within(dialog).getByRole("table", { name: "Shifts" });
		expect(within(table).getAllByRole("row")).toHaveLength(
			SHIFT_FIXTURES.length + 1
		);
		for (const shift of SHIFT_FIXTURES)
			if (INCLUDED_SHIFT_IDS.includes(shift.shiftId))
				expect(checkbox(shift.name)).toBeChecked();
			else expect(checkbox(shift.name)).not.toBeChecked();
		expect(calls.map((call) => `${call.method} ${call.path}`)).toEqual(
			expect.arrayContaining([`GET ${SCHEDULE}`, `GET ${SCHEDULE_SHIFTS}`])
		);
		// A tab per group, above the table.
		const tabs = within(dialog).getByRole("tablist", { name: "Shift types" });
		expect(within(tabs).getAllByRole("tab")).toHaveLength(6);
	});

	it("given_aGeneratedSchedule_when_reopenedAtSetup_then_itsDoneStepsAreTickedAheadButNotJumpedTo", async () => {
		await open(SETUP_OF_S1, {
			[`GET ${SCHEDULE}`]: reply(
				generatedScheduleFixture({ status: "GENERATED" })
			),
			[`GET ${SCHEDULE_SHIFTS}`]: reply(frozenShiftsFixture()),
			[`GET ${SCHEDULE_CONSTRAINTS}`]: reply(frozenConstraintsFixture()),
		});

		expect(
			await screen.findByRole("listitem", {
				name: "Step 2: Forecast, completed",
			})
		).toBeVisible();
		expect(
			screen.getByRole("listitem", { name: "Step 3: Generate, completed" })
		).toBeVisible();
		const steps = screen.getByRole("navigation", { name: "Steps" });
		expect(within(steps).queryByRole("button")).not.toBeInTheDocument();
	});

	it("given_aDraftOnItsForecast_when_setupIsChosen_then_itIsTickedAndCanBeReturnedTo", async () => {
		const user = userEvent.setup();
		await reopen();

		await user.click(
			await screen.findByRole("button", { name: "Step 1: Setup, completed" })
		);

		expect(
			await screen.findByRole("region", { name: "Schedule setup" })
		).toBeVisible();
	});

	it("given_aDraftTheApiDoesNotHave_when_opened_then_saysSo", async () => {
		await open("/scheduling/new?step=forecast&scheduleId=s-9&departmentId=d-1");

		expect(
			await screen.findByText(
				"This draft doesn’t exist or you don’t have permission to see it."
			)
		).toBeVisible();
		expect(
			screen.getByRole("link", { name: "Back to overview" })
		).toHaveAttribute("href", "/scheduling");
		expect(screen.queryByRole("navigation", { name: "Steps" })).toBeNull();
	});

	it("given_aDepartmentWithoutScheduleRead_when_opened_then_saysSoWithoutAsking", async () => {
		const { calls } = await open(
			REOPEN,
			{},
			grantedAt({ "d-2": ["schedule:read"] })
		);

		expect(
			await screen.findByText(
				"This draft doesn’t exist or you don’t have permission to see it."
			)
		).toBeVisible();
		expect(calls.filter((call) => call.path.includes("/schedules"))).toEqual(
			[]
		);
	});

	it("given_changedTicks_when_setupCompleted_then_putsTheSetupWithTheChosenShifts", async () => {
		const user = userEvent.setup();
		const { calls } = await open(SETUP_OF_S1, {
			[`PUT ${SCHEDULE}`]: reply(DRAFT),
		});
		await user.click(
			await screen.findByRole("button", { name: "Choose for this week" })
		);
		const dialog = await screen.findByRole("dialog", {
			name: /^What .+ uses$/,
		});

		await user.click(checkbox("Swing Shift"));
		await user.click(checkbox("Overnight Ops"));
		await user.click(
			within(dialog).getByRole("button", { name: "Use for week" })
		);
		await user.click(next());

		await screen.findByRole("region", { name: "Staffing forecast" });
		expect(sent(calls, `PUT ${SCHEDULE}`)).toEqual([
			{
				...DRAFT_SETUP,
				includedShiftIds: [
					"front-desk-am",
					"breakfast-prep",
					"lunch-rush",
					"overnight-ops",
				],
				includedConstraintIds: INCLUDED_CONSTRAINT_IDS,
			},
		]);
		expect(writes(calls)).toEqual([`PUT ${SCHEDULE}`]);
	});

	it("given_aSaveRefusedAsNoLongerADraft_when_draftSaved_then_saysSo", async () => {
		const user = userEvent.setup();
		await reopen({
			[`PUT ${SCHEDULE}`]: problemReply(409, "SCHEDULE_NOT_DRAFT"),
		});
		await screen.findByRole("row", { name: /Front Desk AM/ });

		await user.click(screen.getByRole("button", { name: "Save draft" }));

		expect(await screen.findByRole("alert")).toHaveTextContent(
			"This schedule is no longer a draft, so it can’t be changed."
		);
	});

	it("given_noShiftsChosen_when_choosingTheWeek_then_saysWhyAndUseIsDisabled", async () => {
		const user = userEvent.setup();
		await open(SETUP_OF_S1, {
			[`GET ${SCHEDULE}`]: reply(scheduleFixture({ includedShiftIds: [] })),
			[`GET ${SCHEDULE_SHIFTS}`]: reply(
				DRAFT_SHIFTS.map((shift) => ({ ...shift, included: false }))
			),
		});

		await user.click(
			await screen.findByRole("button", { name: "Choose for this week" })
		);
		const dialog = await screen.findByRole("dialog", {
			name: /^What .+ uses$/,
		});

		expect(within(dialog).getByRole("alert")).toHaveTextContent(
			"Choose at least one shift for this week."
		);
		expect(
			within(dialog).getByRole("button", { name: "Use for week" })
		).toBeDisabled();
	});
});

describe("Create Schedule: three steps", () => {
	it("given_theWizard_when_opened_then_itsStepsAreSetupForecastAndGenerate", async () => {
		await open("/scheduling/new");

		const steps = await screen.findByRole("navigation", { name: "Steps" });
		expect(
			within(steps)
				.getAllByRole("listitem")
				.map((step) => step.getAttribute("aria-label") ?? step.textContent)
		).toEqual(["Step 1: Setup", "Step 2: Forecast", "Step 3: Generate"]);
	});

	it("given_anOldShiftsUrl_when_opened_then_opensSetup", async () => {
		await open("/scheduling/new?step=shifts&scheduleId=s-1&departmentId=d-1");

		expect(
			await screen.findByRole("region", { name: "Schedule setup" })
		).toBeVisible();
		expect(
			await screen.findByRole("textbox", { name: /Schedule name/ })
		).toHaveValue("Front Office - Week 42");
	});

	it("given_theGenerateStep_when_changeClicked_then_returnsToSetup", async () => {
		const user = userEvent.setup();
		const { opened } = await open(
			"/scheduling/new?step=generate&scheduleId=s-1&departmentId=d-1"
		);
		await screen.findByRole("region", { name: "Ready to generate" });

		await user.click(await screen.findByRole("button", { name: "Change" }));

		expect(
			await screen.findByRole("region", { name: "Schedule setup" })
		).toBeVisible();
		expect(opened.router.state.location.search).toMatchObject({
			step: "setup",
			scheduleId: "s-1",
		});
	});
});

describe("Create Schedule: generating", () => {
	it("given_everyStep_when_completed_then_reachesGenerateWithTheSummary", async () => {
		const user = userEvent.setup();
		await reopen();

		// Nothing is allocated until the person says so.
		expect((await screen.findAllByText("0 staff allocated"))[0]).toBeVisible();
		await user.click(
			screen.getByRole("button", { name: "More Front Desk Lead" })
		);
		await user.click(next());

		await screen.findByRole("region", { name: "Ready to generate" });
		const summary = screen.getByLabelText("Schedule summary");
		// Four shifts with eleven roles between them; one role has someone.
		expect(
			within(summary)
				.getAllByRole("definition")
				.map((value) => value.textContent)
		).toEqual(["4", "11", "9%"]);
		expect(screen.getByRole("button", { name: "Generate" })).toBeEnabled();
		expect(screen.getByRole("button", { name: "Save draft" })).toBeEnabled();
	});

	it("given_aDraft_when_generated_then_savesItRequestsGenerationAndReturnsToSchedulingWithAConfirmation", async () => {
		const user = userEvent.setup();
		const { opened, calls } = await reopen({
			[`PUT ${SCHEDULE}`]: reply(DRAFT),
			[`POST ${GENERATION}`]: reply(generatedScheduleFixture()),
		});
		await toGenerate(user);

		await user.click(screen.getByRole("button", { name: "Generate" }));

		await waitFor(() => {
			expect(opened.router.state.location.pathname).toBe("/scheduling");
		});
		expect(await screen.findByRole("status")).toHaveTextContent(
			"Generation requested for Front Office - Week 42."
		);
		expect(writes(calls)).toEqual([`PUT ${SCHEDULE}`, `POST ${GENERATION}`]);
		expect(sent(calls, `PUT ${SCHEDULE}`)).toEqual([
			{
				...DRAFT_SETUP,
				includedShiftIds: INCLUDED_SHIFT_IDS,
				includedConstraintIds: INCLUDED_CONSTRAINT_IDS,
			},
		]);
	});

	it.each([
		[
			"SCHEDULE_HAS_NO_SHIFTS",
			"Choose at least one shift before generating this schedule.",
		],
		["SCHEDULE_NOT_DRAFT", "This schedule has already been generated."],
		[
			"SCHEDULE_CONSTRAINT_UNUSABLE",
			"A chosen constraint names a shift this schedule doesn’t include or a job title that’s no longer active. Tick that shift, edit the constraint or untick it, then try again.",
		],
	])(
		"given_generationRefusedWith_%s_when_generating_then_staysAndSaysWhy",
		async (code, copy) => {
			const user = userEvent.setup();
			const { opened } = await reopen({
				[`PUT ${SCHEDULE}`]: reply(DRAFT),
				[`POST ${GENERATION}`]: problemReply(409, code),
			});
			await screen.findByRole("row", { name: /Front Desk AM/ });
			await toGenerate(user);

			await user.click(screen.getByRole("button", { name: "Generate" }));

			expect(await screen.findByRole("alert")).toHaveTextContent(copy);
			expect(opened.router.state.location.pathname).toBe("/scheduling/new");
		}
	);

	it("given_aRefusedSave_when_generating_then_neverAsksForGeneration", async () => {
		const user = userEvent.setup();
		const { calls } = await reopen({
			[`PUT ${SCHEDULE}`]: problemReply(404, "SHIFT_NOT_FOUND"),
		});
		await screen.findByRole("row", { name: /Front Desk AM/ });
		await toGenerate(user);

		await user.click(screen.getByRole("button", { name: "Generate" }));

		expect(await screen.findByRole("alert")).toHaveTextContent(
			"A chosen shift no longer exists. Check the shifts and try again."
		);
		expect(writes(calls)).toEqual([`PUT ${SCHEDULE}`]);
	});

	it("given_noGenerateKey_when_onTheGenerateStep_then_generateIsDisabledAndSaysWhy", async () => {
		const user = userEvent.setup();
		await reopen(
			{},
			ALL.filter((key) => key !== "schedule:generate")
		);
		await screen.findByRole("row", { name: /Front Desk AM/ });
		await toGenerate(user);

		const generate = screen.getByRole("button", { name: "Generate" });
		expect(generate).toBeDisabled();
		expect(generate).toHaveAccessibleDescription(
			"You don’t have permission to generate this schedule."
		);
	});

	it("given_theWeekAlreadyPublished_when_onTheGenerateStep_then_generateIsDisabledAndTheRosterLinked", async () => {
		const user = userEvent.setup();
		const { calls } = await reopen({
			[`GET ${SCHEDULES}/published-week`]: reply({
				periodStart: DRAFT_SETUP.periodStart,
				scheduleId: "s-9",
			}),
		});
		await screen.findByRole("row", { name: /Front Desk AM/ });
		await toGenerate(user);

		const generate = screen.getByRole("button", { name: "Generate" });
		await waitFor(() => {
			expect(generate).toBeDisabled();
		});
		expect(generate).toHaveAccessibleDescription(
			"This week already has a published roster."
		);
		expect(
			screen.getByRole("link", { name: "Open the published roster" })
		).toHaveAttribute("href", "/scheduling/s-9");
		expect(
			calls.find((call) => call.path === `${SCHEDULES}/published-week`)?.search
		).toBe(`periodStart=${DRAFT_SETUP.periodStart}`);
		expect(writes(calls)).toEqual([]);
	});

	it.each([
		[
			"GENERATION_REQUESTED",
			"Generation has been requested for this schedule. It shows the shifts and constraints it will be generated with and can no longer be changed.",
		],
		[
			"GENERATED",
			"This schedule has been generated. It shows the shifts and constraints it was generated with and can no longer be changed.",
		],
		[
			"GENERATION_FAILED",
			"This schedule couldn’t be generated. It shows the shifts and constraints it was to be generated with and can no longer be changed.",
		],
	] as const)(
		"given_%s_when_reopened_then_theNoticeSaysHowGenerationStands",
		async (status, notice) => {
			await reopen({
				[`GET ${SCHEDULE}`]: reply(generatedScheduleFixture({ status })),
				[`GET ${SCHEDULE_SHIFTS}`]: reply(frozenShiftsFixture()),
				[`GET ${SCHEDULE_CONSTRAINTS}`]: reply(frozenConstraintsFixture()),
			});

			expect(await screen.findByText(notice)).toBeVisible();
		}
	);

	it("given_aGeneratedSchedule_when_reopened_then_showsWhatItWasGeneratedWithReadOnly", async () => {
		const user = userEvent.setup();
		const { calls } = await open(
			"/scheduling/new?step=setup&scheduleId=s-1&departmentId=d-1",
			{
				[`GET ${SCHEDULE}`]: reply(
					generatedScheduleFixture({ status: "GENERATED" })
				),
				[`GET ${SCHEDULE_SHIFTS}`]: reply(frozenShiftsFixture()),
				[`GET ${SCHEDULE_CONSTRAINTS}`]: reply(frozenConstraintsFixture()),
			}
		);

		expect(
			await screen.findByText(
				"This schedule has been generated. It shows the shifts and constraints it was generated with and can no longer be changed."
			)
		).toBeVisible();
		await user.click(await screen.findByRole("button", { name: "View" }));
		const dialog = await screen.findByRole("dialog", {
			name: /^What .+ used$/,
		});
		const table = within(dialog).getByRole("table", { name: "Shifts" });
		expect(within(table).getAllByRole("row")).toHaveLength(
			INCLUDED_SHIFT_IDS.length + 1
		);
		// A copy whose source shift was since deleted is still shown.
		expect(
			within(table).getByRole("row", { name: /Breakfast Prep/ })
		).toBeVisible();
		const constraints = within(dialog).getByRole("table", {
			name: "Constraints",
		});
		expect(within(constraints).getAllByRole("row")).toHaveLength(
			INCLUDED_CONSTRAINT_IDS.length + 1
		);
		// A copy whose source constraint was deactivated since is still shown.
		expect(
			within(constraints).getByRole("row", { name: /Rest between shifts/ })
		).toBeVisible();
		expect(within(dialog).queryByRole("checkbox")).toBeNull();
		// The frozen copies are read, never the department's live constraints.
		expect(calls.map((call) => call.path)).toContain(SCHEDULE_CONSTRAINTS);
		expect(calls.map((call) => call.path)).not.toContain(LIVE_CONSTRAINTS);
		await user.click(
			within(dialog).getAllByRole("button", { name: "Close" })[1]!
		);
		await waitFor(() => {
			expect(screen.queryByRole("dialog")).toBeNull();
		});

		await user.click(next());
		await screen.findByRole("region", { name: "Staffing forecast" });
		await user.click(next());
		await screen.findByRole("region", { name: "Ready to generate" });
		const generate = screen.getByRole("button", { name: "Generate" });
		expect(generate).toBeDisabled();
		expect(generate).toHaveAccessibleDescription(
			"This schedule has already been generated."
		);
		expect(writes(calls)).toEqual([]);
	});
});

describe("Create Schedule: the Generate gate", () => {
	const READINESS = "GET /api/v1/companies/c-1/scheduling-readiness";
	const GENERATE_STEP =
		"/scheduling/new?step=generate&scheduleId=s-1&departmentId=d-1";
	const generateNote = (): string | null => {
		const generate = screen.getByRole("button", { name: "Generate" });
		return (
			document.getElementById(generate.getAttribute("aria-describedby") ?? "")
				?.textContent ?? null
		);
	};

	it("given_aDraftWhoseDepartmentLostItsStaffing_when_onGenerate_then_saysSoAndCannotGenerate", async () => {
		await open(GENERATE_STEP, {
			[READINESS]: reply([
				readinessFixture({
					departmentName: "Front Office",
					ready: false,
					missing: ["STAFFING_CONSTRAINT"],
				}),
			]),
		});

		expect(
			await screen.findByText(
				"Front Office no longer has a staffing constraint, so this schedule can’t be generated.",
				{ exact: false }
			)
		).toBeVisible();
		expect(
			screen.getByRole("link", { name: "Add a staffing constraint" })
		).toHaveAttribute(
			"href",
			"/scheduling?view=constraints&branch=b-1&department=d-1&next=draft&scheduleId=s-1"
		);
		expect(screen.getByRole("button", { name: "Generate" })).toBeDisabled();
		expect(generateNote()).toBe("Fix Front Office’s setup to generate.");
	});

	it("given_aWeekWithoutStaffing_when_onGenerate_then_saysSoAndCannotGenerate", async () => {
		await open(GENERATE_STEP, {
			[`GET ${SCHEDULE}`]: reply(
				scheduleFixture({ includedConstraintIds: ["rest-between-shifts"] })
			),
		});

		expect(
			await screen.findByText(
				"Tick at least one staffing constraint. Without one, nobody is rostered."
			)
		).toBeVisible();
		expect(screen.getByRole("button", { name: "Generate" })).toBeDisabled();
		expect(generateNote()).toBe(
			"Choose what this week uses on Setup to generate."
		);
	});
});

describe("Create Schedule: back from the Scheduling tabs", () => {
	const READINESS = "GET /api/v1/companies/c-1/scheduling-readiness";
	const frontOffice = (ready: boolean): StubReply =>
		reply([
			readinessFixture({
				departmentName: "Front Office",
				branchName: "Main branch",
				ready,
				missing: ready ? [] : ["SHIFT", "STAFFING_CONSTRAINT"],
			}),
		]);

	it("given_theSetupGate_when_fixedOnTheShiftsTab_then_createScheduleReturnsToSetupWithTheDepartmentAndWeek", async () => {
		const user = userEvent.setup();
		await open("/scheduling/new", {
			[`GET ${LIVE_SHIFTS}`]: reply(LIVE_SHIFT_ROWS),
			// Not ready on Setup, ready once the tab asks again.
			[READINESS]: [frontOffice(false), frontOffice(true)],
		});
		await fillSetup(user);
		await user.click(screen.getByRole("button", { name: /Schedule period/ }));
		await user.click((await screen.findAllByRole("option"))[1]!);
		const week = screen.getByRole("button", {
			name: /Schedule period/,
		}).textContent;

		await user.click(
			await screen.findByRole("link", { name: "Set up Front Office" })
		);
		await user.click(
			await screen.findByRole("link", { name: "Create schedule" })
		);

		expect(
			await screen.findByRole("region", { name: "Schedule setup" })
		).toBeVisible();
		await waitFor(() => {
			expect(
				screen.getByRole("button", { name: /Department/ })
			).toHaveTextContent("Front Office");
		});
		expect(
			screen.getByRole("button", { name: /Schedule period/ }).textContent
		).toBe(week);
		expect(screen.getByRole("textbox", { name: /Schedule name/ })).toHaveValue(
			""
		);
	});

	it("given_aSavedDraftsGate_when_itsDepartmentIsReadyOnTheTab_then_backToTheScheduleOpensItsGenerateStep", async () => {
		const user = userEvent.setup();
		const { opened } = await open(
			"/scheduling?view=constraints&branch=b-1&department=d-1&next=draft&scheduleId=s-1",
			{ [READINESS]: frontOffice(true) }
		);

		await user.click(
			await screen.findByRole("link", { name: "Back to the schedule" })
		);

		expect(
			await screen.findByRole("region", { name: "Ready to generate" })
		).toBeVisible();
		expect(opened.router.state.location.search).toMatchObject({
			step: "generate",
			scheduleId: "s-1",
			departmentId: "d-1",
		});
	});
});

describe("Create Schedule: where everyone starts", () => {
	const STARTING_DAYS = `${SCHEDULE}/starting-days`;
	/**
	 * Tan's entered Sunday night, and Siti's Sunday off as "Fill empty days"
	 * sets it: the schedule's first day type.
	 */
	const SUNDAY_ENTRIES = [
		{
			memberProfileId: "p-tan",
			date: "2026-11-08",
			kind: "SHIFT",
			shiftId: "s-night",
		},
		{
			memberProfileId: "p-siti",
			date: "2026-11-08",
			kind: "OFF",
			shiftId: null,
			dayType: "OFF",
		},
	];

	/** The week as the API answers the save: Siti's Sunday now an entered day off. */
	const withSitisSundayOff = (): StartingDays => {
		const week = firstWeek();
		return {
			...week,
			members: week.members.map((member) =>
				member.memberProfileId === "p-siti"
					? {
							...member,
							cells: member.cells.map((cell) =>
								cell.date === "2026-11-08"
									? {
											...unknownCell(cell.date),
											kind: "OFF",
											source: "ENTERED",
											dayType: "OFF",
										}
									: cell
							),
						}
					: member
			),
		};
	};

	it("given_noRosterBefore_when_lastWeeksDaysSaved_then_putsTheEnteredDaysAndSaysWhoHasThem", async () => {
		const user = userEvent.setup();
		const { calls } = await reopen({
			[`GET ${STARTING_DAYS}`]: reply(firstWeek()),
			[`PUT ${STARTING_DAYS}`]: reply(withSitisSundayOff()),
		});
		await screen.findByRole("row", { name: /Front Desk AM/ });
		await toGenerate(user);

		expect(
			await screen.findByText(
				"No roster before this week. Days are added for 1 person; everyone else starts rested."
			)
		).toBeInTheDocument();
		await user.click(screen.getByRole("button", { name: "Edit last week" }));
		const dialog = await screen.findByRole("dialog", {
			name: "Before this week",
		});
		await user.click(
			within(dialog).getByRole("button", { name: "Fill empty days" })
		);
		await user.click(within(dialog).getByRole("button", { name: "Save days" }));

		await waitFor(() => {
			expect(screen.queryByRole("dialog")).toBeNull();
		});
		expect(sent(calls, `PUT ${STARTING_DAYS}`)).toEqual([
			{ days: SUNDAY_ENTRIES },
		]);
		expect(
			screen.getByText(
				"No roster before this week. Days are added for 2 people; everyone else starts rested."
			)
		).toBeInTheDocument();
	});

	it.each([
		[
			"INVALID_STARTING_DAY",
			400,
			"A day couldn’t be saved. Check that its shift is still in use, then try again.",
		],
		[
			"SCHEDULE_NOT_DRAFT",
			409,
			"This schedule has already been generated, so its starting point can no longer change.",
		],
		["SOMETHING_ELSE", 500, "The days couldn’t be saved. Try again."],
	])(
		"given_aSaveRefusedWith_%s_when_lastWeeksDaysSaved_then_theDialogStaysAndSaysWhy",
		async (code, status, copy) => {
			const user = userEvent.setup();
			await reopen({
				[`GET ${STARTING_DAYS}`]: reply(firstWeek()),
				[`PUT ${STARTING_DAYS}`]: problemReply(status, code),
			});
			await screen.findByRole("row", { name: /Front Desk AM/ });
			await toGenerate(user);

			await user.click(
				await screen.findByRole("button", { name: "Edit last week" })
			);
			const dialog = await screen.findByRole("dialog", {
				name: "Before this week",
			});
			await user.click(
				within(dialog).getByRole("button", { name: "Save days" })
			);

			expect(await within(dialog).findByText(copy)).toBeInTheDocument();
			expect(dialog).toBeInTheDocument();
		}
	);

	it("given_noUpdateKey_when_onTheGenerateStep_then_showsWhereEveryoneStartsWithoutAnEdit", async () => {
		const user = userEvent.setup();
		await reopen(
			{ [`GET ${STARTING_DAYS}`]: reply(firstWeek()) },
			ALL.filter((key) => key !== "schedule:update")
		);
		await screen.findByRole("row", { name: /Front Desk AM/ });
		await toGenerate(user);

		expect(
			await screen.findByText(/^No roster before this week\./)
		).toBeInTheDocument();
		expect(screen.queryByRole("button", { name: /last week/ })).toBeNull();
	});
});

describe("Create Schedule: the header's Branch", () => {
	it("given_oneBranchToCreateIn_when_setupOpens_then_theHeaderNamesItAsText", async () => {
		await open("/scheduling/new");
		await screen.findByRole("textbox", { name: /Schedule name/ });

		const header = screen.getByRole("banner");
		expect(
			within(header).queryByRole("button", { name: "Branch" })
		).not.toBeInTheDocument();
		expect(within(header).getByText("Main branch")).toBeVisible();
	});

	it("given_twoBranches_when_theHeaderBranchChanges_then_offersItsDepartmentsAndLetsTheChosenOneGo", async () => {
		const user = userEvent.setup();
		const { opened } = await open(
			"/scheduling/new",
			{},
			twoBranchSchedulingWorkspace(ALL)
		);
		await screen.findByRole("textbox", { name: /Schedule name/ });
		const header = screen.getByRole("banner");
		const branch = within(header).getByRole("button", { name: "Branch" });
		// The Scheduling list's rule: the first Branch by name, "All branches" last.
		expect(branch).toHaveTextContent("Main branch");

		await user.click(screen.getByRole("button", { name: /Department/ }));
		expect(
			screen.getAllByRole("option").map((option) => option.textContent)
		).toEqual(["Front Office", "Kitchen"]);
		await user.click(screen.getByRole("option", { name: "Kitchen" }));

		await user.click(branch);
		const options = screen.getAllByRole("option");
		expect(options[options.length - 1]).toHaveTextContent("All branches");
		await user.click(screen.getByRole("option", { name: "North" }));

		await waitFor(() => {
			expect(opened.router.state.location.search).toMatchObject({
				branch: "b-2",
			});
		});
		await waitFor(() => {
			expect(
				screen.getByRole("button", { name: /Department/ })
			).toHaveTextContent("Select a department");
		});
		await user.click(screen.getByRole("button", { name: /Department/ }));
		expect(
			screen.getAllByRole("option").map((option) => option.textContent)
		).toEqual(["Front Office"]);
	});

	it("given_aReopenedDraft_when_shown_then_theHeaderNamesItsBranchAndKeepsTheListsChoice", async () => {
		const { opened } = await open(
			`${REOPEN}&branch=all`,
			{},
			twoBranchSchedulingWorkspace(ALL)
		);
		await screen.findByRole("region", { name: "Staffing forecast" });

		const header = screen.getByRole("banner");
		expect(
			within(header).queryByRole("button", { name: "Branch" })
		).not.toBeInTheDocument();
		expect(within(header).getByText("Main branch")).toBeVisible();
		// The draft fixes what the header shows, not what the list chose.
		expect(opened.router.state.location.search).toMatchObject({
			branch: "all",
		});
	});
});
