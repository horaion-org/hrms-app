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
import type { Shift } from "@/features/scheduling/scheduleDraft";
import {
	generatedScheduleFixture,
	scheduleFixture,
	schedulingWorkspace,
} from "@/features/scheduling/schedules/fixtures";
import {
	INCLUDED_SHIFT_IDS,
	SHIFT_FIXTURES,
	SHIFT_ROLE_OPTIONS,
	departmentShiftFixture,
	frozenShiftsFixture,
	scheduleShiftsFixture,
} from "@/features/scheduling/shifts/fixtures";
import type { Workspace } from "@/features/workspace/api";

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
const ALL = [
	"schedule:read",
	"schedule:create",
	"schedule:update",
	"schedule:generate",
	"shift:read",
	"shift:create",
	"shift:update",
	"shift:delete",
];
const DRAFT = scheduleFixture();
const DRAFT_SHIFTS = scheduleShiftsFixture();
/** Front Desk AM, the first shift listed. */
const FIRST_SHIFT = DRAFT_SHIFTS[0] as Shift;
/** A reopened draft lands here. */
const REOPEN = "/scheduling/new?step=shifts&scheduleId=s-1&departmentId=d-1";
const DRAFT_SETUP = {
	name: "Front Office - Week 42",
	periodStart: "2026-10-12",
	includeLeave: true,
	allowOpenShifts: false,
};

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

/** Opens the saved draft s-1 on its Shifts step, once its step is shown. */
const reopen = async (
	extra: Record<string, StubReply | Array<StubReply>> = {},
	permissions: Array<string> | Workspace = ALL,
	entry = REOPEN
): Promise<{ opened: OpenedApp; calls: Array<Call> }> => {
	const opened = await open(entry, extra, permissions);
	await screen.findByRole("region", { name: "Select shifts" });
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

/** Clicks Next until the Generate step is shown. */
const toGenerate = async (
	user: ReturnType<typeof userEvent.setup>
): Promise<void> => {
	await user.click(next());
	await screen.findByRole("region", { name: "Scheduling constraints" });
	await user.click(next());
	await screen.findByRole("region", { name: "Staffing forecast" });
	await user.click(next());
	await screen.findByRole("region", { name: "Ready to generate" });
};

/** Opens one of the dialog's selects, picks each option and closes it. */
const pick = async (
	user: ReturnType<typeof userEvent.setup>,
	dialog: HTMLElement,
	name: RegExp,
	...labels: Array<string>
): Promise<void> => {
	await user.click(within(dialog).getByRole("button", { name }));
	await labels.reduce(
		(previous, label) =>
			previous.then(async () => {
				await user.click(await screen.findByRole("option", { name: label }));
			}),
		Promise.resolve()
	);
	if (screen.queryByRole("listbox")) await user.keyboard("{Escape}");
};

const fillSetup = async (
	user: ReturnType<typeof userEvent.setup>
): Promise<void> => {
	await user.click(await screen.findByRole("button", { name: /Department/ }));
	await user.click(
		await screen.findByRole("option", { name: "Main branch › Front Office" })
	);
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
			await screen.findByRole("heading", { level: 1, name: "Scheduling" })
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
			"/scheduling/new?step=shifts&scheduleId=s-1"
		);

		expect(
			await screen.findByRole("region", { name: "Schedule setup" })
		).toBeVisible();
		await settled(opened.router);
		expect(opened.router.state.location.search).toEqual({ step: "setup" });
		expect(calls.filter((call) => call.path === SCHEDULE)).toEqual([]);
	});

	it("given_aCompletedSetup_when_nextClicked_then_createsTheDraftAtTheChosenDepartmentAndOpensItsShifts", async () => {
		const user = userEvent.setup();
		const created = scheduleFixture({ includedShiftIds: [] });
		const { opened, calls } = await open("/scheduling/new", {
			[`POST ${SCHEDULES}`]: reply(created, 201),
			[`GET ${SCHEDULE}`]: reply(created),
			[`GET ${SCHEDULE_SHIFTS}`]: reply([]),
		});

		await fillSetup(user);
		await user.click(next());

		await screen.findByRole("region", { name: "Select shifts" });
		expect(opened.router.state.location.search).toEqual({
			step: "shifts",
			scheduleId: "s-1",
			departmentId: "d-1",
		});
		expect(sent(calls, `POST ${SCHEDULES}`)).toEqual([
			{
				...DRAFT_SETUP,
				periodStart: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) as string,
				includedShiftIds: [],
			},
		]);
		expect(await screen.findByText("No shifts yet.")).toBeVisible();
	});

	it("given_aRefusedPeriod_when_setupCompleted_then_saysSoOnThePeriod", async () => {
		const user = userEvent.setup();
		const { opened } = await open("/scheduling/new", {
			[`POST ${SCHEDULES}`]: problemReply(400, "SCHEDULE_PERIOD_NOT_MONDAY"),
		});

		await fillSetup(user);
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

		await screen.findByRole("region", { name: "Select shifts" });
		expect(opened.router.state.location.search).toEqual({
			step: "shifts",
			scheduleId: "s-1",
			departmentId: "d-1",
		});
		expect(sent(calls, `PUT ${SCHEDULE}`)).toEqual([
			{
				...DRAFT_SETUP,
				name: "Front Office - Late Week",
				includedShiftIds: INCLUDED_SHIFT_IDS,
			},
		]);
		expect(sent(calls, `POST ${SCHEDULES}`)).toEqual([]);
	});
});

describe("Create Schedule: a reopened draft", () => {
	it("given_aDraftsUrl_when_reopened_then_listsItsShiftsTickedAsTheApiKeepsThem", async () => {
		const user = userEvent.setup();
		const { calls } = await reopen();

		const table = await screen.findByRole("table", { name: "Shifts" });
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
		const tabs = screen.getByRole("tablist", { name: "Shift groups" });
		expect(within(tabs).getAllByRole("tab")).toHaveLength(6);

		await user.click(screen.getByRole("button", { name: "Back" }));

		expect(
			await screen.findByRole("textbox", { name: /Schedule name/ })
		).toHaveValue("Front Office - Week 42");
		const department = screen.getByRole("button", { name: /Department/ });
		expect(department).toHaveTextContent("Main branch › Front Office");
		expect(department).toBeDisabled();
	});

	it("given_aDraftTheApiDoesNotHave_when_opened_then_saysSo", async () => {
		await open("/scheduling/new?step=shifts&scheduleId=s-9&departmentId=d-1");

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

	it("given_changedTicks_when_draftSaved_then_putsTheSetupWithTheTickedShifts", async () => {
		const user = userEvent.setup();
		const { calls } = await reopen({ [`PUT ${SCHEDULE}`]: reply(DRAFT) });
		await screen.findByRole("row", { name: /Front Desk AM/ });

		await user.click(checkbox("Swing Shift"));
		await user.click(checkbox("Overnight Ops"));
		await user.click(screen.getByRole("button", { name: "Save draft" }));

		await waitFor(() => {
			expect(screen.getByRole("status")).toHaveTextContent("Draft saved");
		});
		expect(sent(calls, `PUT ${SCHEDULE}`)).toEqual([
			{
				...DRAFT_SETUP,
				includedShiftIds: [
					"front-desk-am",
					"breakfast-prep",
					"lunch-rush",
					"overnight-ops",
				],
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

	it("given_noShiftsChosen_when_nextClicked_then_staysAndSaysWhy", async () => {
		const user = userEvent.setup();
		const { opened } = await reopen({
			[`GET ${SCHEDULE}`]: reply(scheduleFixture({ includedShiftIds: [] })),
			[`GET ${SCHEDULE_SHIFTS}`]: reply(
				DRAFT_SHIFTS.map((shift) => ({ ...shift, included: false }))
			),
		});
		await screen.findByRole("row", { name: /Front Desk AM/ });

		await user.click(next());

		expect(screen.getByRole("alert")).toHaveTextContent(
			"Choose at least one shift to include in this schedule."
		);
		expect(opened.router.state.location.search).toEqual({
			step: "shifts",
			scheduleId: "s-1",
			departmentId: "d-1",
		});
	});

	it("given_aConstraint_when_deleted_then_removesItAndConfirms", async () => {
		const user = userEvent.setup();
		await reopen();
		await screen.findByRole("row", { name: /Front Desk AM/ });
		await user.click(next());
		await screen.findByRole("region", { name: "Scheduling constraints" });

		await user.click(
			screen.getByRole("button", { name: "Delete Rest Between Shifts" })
		);

		expect(
			screen.queryByRole("row", { name: /Rest Between Shifts/ })
		).toBeNull();
		await waitFor(() => {
			expect(screen.getByRole("status")).toHaveTextContent(
				"Constraint successfully deleted"
			);
		});
	});
});

describe("Create Schedule: the department's shifts", () => {
	it("given_aShift_when_addedThroughTheDialog_then_postsItToTheDepartmentAndTicksIt", async () => {
		const user = userEvent.setup();
		const created = departmentShiftFixture({
			...FIRST_SHIFT,
			shiftId: "evening-desk",
			name: "Evening Desk",
			group: "Evening",
		});
		const { calls } = await reopen({
			[`POST ${LIVE_SHIFTS}`]: reply(created, 201),
			// The shifts reload after the save; from then on they list the new one, not yet ticked.
			[`GET ${SCHEDULE_SHIFTS}`]: [
				reply(DRAFT_SHIFTS),
				reply([
					...DRAFT_SHIFTS,
					{ ...created, included: false, frozen: false },
				]),
			],
		});
		await screen.findByRole("row", { name: /Front Desk AM/ });

		await user.click(screen.getByRole("button", { name: "Add custom shift" }));
		const dialog = await screen.findByRole("dialog", {
			name: "Add custom shift",
		});
		await user.type(
			within(dialog).getByLabelText("Shift name"),
			"Evening Desk"
		);
		await user.click(
			within(dialog).getByRole("button", { name: /Shift group/ })
		);
		await user.type(screen.getByRole("combobox"), "Evening");
		await user.click(screen.getByRole("option", { name: 'Create "Evening"' }));
		await user.click(within(dialog).getByRole("radio", { name: "Slate" }));
		await pick(user, dialog, /Start time/, "17:00");
		await pick(user, dialog, /End time/, "23:00");
		await pick(user, dialog, /Days applied to/, "Monday");
		await waitFor(() => {
			expect(
				within(dialog).getByRole("button", { name: /Roles applied to/ })
			).toBeEnabled();
		});
		await pick(user, dialog, /Roles applied to/, "Front Desk Staff");
		await user.click(within(dialog).getByRole("button", { name: "Save" }));

		await waitFor(() => {
			expect(screen.getByRole("status")).toHaveTextContent("Shift added");
		});
		// The shifts reload with the new one, ticked here, under a tab for its group.
		await screen.findByRole("row", { name: /Evening Desk/ });
		expect(checkbox("Evening Desk")).toBeChecked();
		await user.click(screen.getByRole("tab", { name: /Evening/ }));
		expect(
			within(screen.getByRole("table", { name: "Shifts" })).getAllByRole("row")
		).toHaveLength(2);
		expect(sent(calls, `POST ${LIVE_SHIFTS}`)).toEqual([
			{
				name: "Evening Desk",
				group: "Evening",
				colour: "#6E72A5",
				startTime: "17:00",
				endTime: "23:00",
				days: ["MON"],
				jobTitleIds: ["front-desk-staff"],
			},
		]);
		// The roles come from the shifts module, never from the job titles list.
		expect(calls.filter((call) => call.path.endsWith("/job-titles"))).toEqual(
			[]
		);
		expect(calls.map((call) => call.path)).toContain(ROLE_OPTIONS);
	});

	it("given_aShift_when_editedThroughTheDialog_then_putsItAtTheDepartment", async () => {
		const user = userEvent.setup();
		const { calls } = await reopen({
			[`PUT ${LIVE_SHIFTS}/front-desk-am`]: reply(
				departmentShiftFixture({ ...FIRST_SHIFT, name: "Front Desk Early" })
			),
		});
		await screen.findByRole("row", { name: /Front Desk AM/ });

		await user.click(
			screen.getByRole("button", { name: "Edit Front Desk AM" })
		);
		const dialog = await screen.findByRole("dialog", { name: "Edit shift" });
		const name = within(dialog).getByLabelText("Shift name");
		await user.clear(name);
		await user.type(name, "Front Desk Early");
		await user.click(within(dialog).getByRole("button", { name: "Save" }));

		await waitFor(() => {
			expect(screen.getByRole("status")).toHaveTextContent("Shift saved");
		});
		expect(sent(calls, `PUT ${LIVE_SHIFTS}/front-desk-am`)).toEqual([
			expect.objectContaining({ name: "Front Desk Early" }),
		]);
	});

	it("given_aShift_when_deleted_then_deletesItAtTheDepartmentAndUnticksIt", async () => {
		const user = userEvent.setup();
		const { calls } = await reopen({
			[`DELETE ${LIVE_SHIFTS}/front-desk-am`]: { status: 204 },
			[`PUT ${SCHEDULE}`]: reply(DRAFT),
		});
		await screen.findByRole("row", { name: /Front Desk AM/ });

		await user.click(
			screen.getByRole("button", { name: "Delete Front Desk AM" })
		);

		await waitFor(() => {
			expect(screen.getByRole("status")).toHaveTextContent(
				"Shift successfully deleted"
			);
		});
		await user.click(screen.getByRole("button", { name: "Save draft" }));
		await waitFor(() => {
			expect(sent(calls, `PUT ${SCHEDULE}`)).toHaveLength(1);
		});
		expect(writes(calls)).toEqual([
			`DELETE ${LIVE_SHIFTS}/front-desk-am`,
			`PUT ${SCHEDULE}`,
		]);
		expect(sent(calls, `PUT ${SCHEDULE}`)).toEqual([
			{
				...DRAFT_SETUP,
				includedShiftIds: ["breakfast-prep", "lunch-rush", "swing-shift"],
			},
		]);
	});

	it("given_aDeleteRefused_when_deleting_then_saysWhy", async () => {
		const user = userEvent.setup();
		await reopen({
			[`DELETE ${LIVE_SHIFTS}/front-desk-am`]: problemReply(
				404,
				"SHIFT_NOT_FOUND"
			),
		});
		await screen.findByRole("row", { name: /Front Desk AM/ });

		await user.click(
			screen.getByRole("button", { name: "Delete Front Desk AM" })
		);

		expect(await screen.findByRole("alert")).toHaveTextContent(
			"This shift no longer exists."
		);
	});

	it("given_noShiftReadKey_when_onTheShiftsStep_then_saysTheShiftsAreHidden", async () => {
		const { calls } = await reopen({}, ["schedule:read", "schedule:update"]);

		expect(
			await screen.findByText(
				"You don’t have permission to see this department’s shifts."
			)
		).toBeVisible();
		expect(screen.queryByRole("table", { name: "Shifts" })).toBeNull();
		expect(calls.filter((call) => call.path === SCHEDULE_SHIFTS)).toEqual([]);
	});

	it("given_onlyReadKeys_when_onTheShiftsStep_then_listsThemButOffersNoChanges", async () => {
		await reopen({}, ["schedule:read", "shift:read"]);
		await screen.findByRole("row", { name: /Front Desk AM/ });

		expect(
			screen.getByText(
				"You can view this draft, but you don’t have permission to change it."
			)
		).toBeVisible();
		expect(
			screen.queryByRole("button", { name: "Add custom shift" })
		).toBeNull();
		expect(screen.queryByRole("button", { name: /^Edit / })).toBeNull();
		expect(screen.queryByRole("button", { name: /^Delete / })).toBeNull();
		expect(screen.queryByRole("button", { name: "Save draft" })).toBeNull();
	});

	it("given_keysHeldAtTheDepartmentOnly_when_onItsShifts_then_eachActionFollowsItsOwnKeyThere", async () => {
		const workspace = grantedAt({
			"d-1": ["schedule:read", "shift:read", "shift:create"],
			// Held at another department, so never offered here.
			"d-2": ["shift:update", "shift:delete", "schedule:update"],
		});
		await reopen({}, workspace);
		await screen.findByRole("row", { name: /Front Desk AM/ });

		expect(
			screen.getByRole("button", { name: "Add custom shift" })
		).toBeVisible();
		expect(screen.queryByRole("button", { name: /^Edit / })).toBeNull();
		expect(screen.queryByRole("button", { name: /^Delete / })).toBeNull();
		expect(screen.queryByRole("button", { name: "Save draft" })).toBeNull();
	});
});

describe("Create Schedule: generating", () => {
	it("given_everyStep_when_completed_then_reachesGenerateWithTheSummary", async () => {
		const user = userEvent.setup();
		await reopen();
		await screen.findByRole("row", { name: /Front Desk AM/ });

		await user.click(next());
		await screen.findByRole("region", { name: "Scheduling constraints" });
		await user.click(next());
		await screen.findByRole("region", { name: "Staffing forecast" });
		// Nothing is allocated until the person says so.
		expect(screen.getAllByText("0 staff allocated")[0]).toBeVisible();
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
		await screen.findByRole("row", { name: /Front Desk AM/ });
		await user.click(checkbox("Overnight Ops"));
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
				includedShiftIds: [...INCLUDED_SHIFT_IDS, "overnight-ops"],
			},
		]);
	});

	it.each([
		[
			"SCHEDULE_HAS_NO_SHIFTS",
			"Choose at least one shift before generating this schedule.",
		],
		["SCHEDULE_NOT_DRAFT", "This schedule has already been generated."],
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

	it("given_aGeneratedSchedule_when_reopened_then_showsItsFrozenShiftsReadOnly", async () => {
		const user = userEvent.setup();
		const { calls } = await reopen({
			[`GET ${SCHEDULE}`]: reply(generatedScheduleFixture()),
			[`GET ${SCHEDULE_SHIFTS}`]: reply(frozenShiftsFixture()),
		});

		expect(
			await screen.findByText(
				"This schedule has been generated. It shows the shifts it was generated with and can no longer be changed."
			)
		).toBeVisible();
		const table = await screen.findByRole("table", { name: "Shifts" });
		expect(within(table).getAllByRole("row")).toHaveLength(
			INCLUDED_SHIFT_IDS.length + 1
		);
		// A copy whose source shift was since deleted is still shown.
		expect(
			within(table).getByRole("row", { name: /Breakfast Prep/ })
		).toBeVisible();
		expect(screen.queryByRole("checkbox")).toBeNull();
		expect(
			screen.queryByRole("button", { name: "Add custom shift" })
		).toBeNull();
		expect(
			screen.queryByRole("button", { name: /^(Edit|Delete) / })
		).toBeNull();
		expect(screen.queryByRole("button", { name: "Save draft" })).toBeNull();

		await toGenerate(user);
		const generate = screen.getByRole("button", { name: "Generate" });
		expect(generate).toBeDisabled();
		expect(generate).toHaveAccessibleDescription(
			"This schedule has already been generated."
		);
		expect(writes(calls)).toEqual([]);
	});
});
