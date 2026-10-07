import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
import { refreshWorkspaceOnRefusal } from "@/features/workspace/refreshWorkspaceOnRefusal";

const COMPANY = "/api/v1/companies/c-1";
const KITCHEN = `${COMPANY}/branches/b-1/departments/d-1`;
const CREATE = `POST ${KITCHEN}/member-profiles`;
const ASSIGN = `POST ${KITCHEN}/access-role-assignments`;
const WORKSPACE = "GET /api/v1/me/workspace";
const ALL = [
	"member_profile:read",
	"member_profile:create",
	"branch:read",
	"department:read",
	"job_title:read",
	"company_member:read",
	"access_role:read",
	"access_role:assign",
];

const page = (content: Array<unknown>): StubReply => ({
	status: 200,
	body: envelope({ content, page: { totalElements: content.length } }),
});
const workspaceReply = (
	company: Array<string>,
	kitchen: Array<string> = []
): StubReply => ({
	status: 200,
	body: envelope({
		companies: [
			{
				uuid: "c-1",
				name: "Company c-1",
				permissions: company,
				branches: [
					{
						uuid: "b-1",
						name: "Orchard",
						permissions: [],
						departments: [
							{ uuid: "d-1", name: "Kitchen", permissions: kitchen },
						],
					},
				],
			},
		],
	}),
});
const branch = (branchId: string, name: string, country: string): unknown => ({
	branchId,
	name,
	code: branchId.toUpperCase(),
	city: "City",
	country,
	status: "ACTIVE",
});
const department = (
	departmentId: string,
	branchId: string,
	name: string
): unknown => ({ departmentId, branchId, name, status: "ACTIVE" });
const jobTitle = (
	jobTitleId: string,
	departmentId: string,
	name: string
): unknown => ({
	jobTitleId,
	branchId: departmentId === "d-1" ? "b-1" : "b-2",
	branchName: departmentId === "d-1" ? "Orchard" : "Bukit Bintang",
	departmentId,
	departmentName: departmentId === "d-1" ? "Kitchen" : "Kitchen",
	name,
	status: "ACTIVE",
});
const role = (
	accessRoleId: string,
	name: string,
	overrides: Record<string, unknown> = {}
): unknown => ({
	accessRoleId,
	name,
	protectedRole: false,
	status: "ACTIVE",
	permissions: ["branch:read"],
	holderCount: 0,
	...overrides,
});
const created = {
	membershipId: "m-new",
	employeeCode: "EMP-1",
	displayName: "Priya Nair",
	email: "priya@company.com",
	phone: null,
	branchId: "b-1",
	branchName: "Orchard",
	departmentId: "d-1",
	departmentName: "Kitchen",
	jobTitleId: null,
	jobTitleName: null,
	status: "ACTIVE",
};

const routes = (
	workspace: StubReply = workspaceReply(ALL)
): Record<string, StubReply | ((call: { search: string }) => StubReply)> => ({
	"POST /api/v1/public/sessions/refreshes": accessPassReply(),
	"GET /api/v1/me": currentUserReply(),
	[WORKSPACE]: workspace,
	[`GET ${COMPANY}/member-profiles`]: page([]),
	[`GET ${COMPANY}/branches`]: page([
		branch("b-1", "Orchard", "SG"),
		branch("b-2", "Bukit Bintang", "MY"),
	]),
	// The same name in two branches, told apart by the branch.
	[`GET ${COMPANY}/departments`]: page([
		department("d-1", "b-1", "Kitchen"),
		department("d-2", "b-2", "Kitchen"),
	]),
	[`GET ${COMPANY}/job-titles`]: (call) =>
		new URLSearchParams(call.search).get("departmentId") === "d-1"
			? page([jobTitle("j-1", "d-1", "Chef")])
			: page([jobTitle("j-2", "d-2", "Cook")]),
	[`GET ${COMPANY}/members`]: page([
		{ membershipId: "m-9", displayName: "Marcus Lim", status: "ACTIVE" },
	]),
	[`GET ${COMPANY}/access-roles`]: page([
		role("r-0", "Company owner", { protectedRole: true }),
		role("r-1", "Supervisor"),
		role("r-2", "Retired", { status: "INACTIVE" }),
	]),
	[CREATE]: { status: 201, body: envelope(created) },
	[ASSIGN]: { status: 201 },
});

let app: OpenedApp | undefined;
let stopRefreshing: (() => void) | undefined;
beforeEach(() => {
	vi.spyOn(window, "scrollTo").mockImplementation(() => {});
	// Only the clock is fixed, so the date pickers open on a known month.
	vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-10-06T09:00:00") });
});
afterEach(() => {
	stopRefreshing?.();
	stopRefreshing = undefined;
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

const open = async (entry = "/people/new"): Promise<OpenedApp> => {
	app = await openApp(entry);
	stopRefreshing = refreshWorkspaceOnRefusal(app.queryClient);
	renderAuthApp(app);
	return app;
};

type User = ReturnType<typeof userEvent.setup>;
const textbox = (name: string): HTMLElement =>
	screen.getByRole("textbox", { name });
const button = (name: RegExp | string): HTMLElement =>
	screen.getByRole("button", { name });
const confirm = (): HTMLElement => button("Confirm");
const sent = (
	calls: Array<{ method: string; path: string; body?: unknown }>,
	route: string
): Array<{ body?: unknown }> =>
	calls.filter((call) => `${call.method} ${call.path}` === route);

const chooseDepartment = async (user: User, option: string): Promise<void> => {
	await user.click(await screen.findByRole("button", { name: /^Department/ }));
	await user.click(await screen.findByRole("option", { name: option }));
};
const choose = async (
	user: User,
	field: RegExp,
	option: string
): Promise<void> => {
	await user.click(button(field));
	await user.click(await screen.findByRole("option", { name: option }));
};
/** A calendar day by its date, e.g. "1 October 2026" but not "11 October 2026". */
const dayOf = (day: string): RegExp => new RegExp(`, ${day}$`);
const pickDate = async (
	user: User,
	field: RegExp,
	day: string
): Promise<void> => {
	await user.click(button(field));
	await user.click(await screen.findByRole("gridcell", { name: dayOf(day) }));
};
/** Fills in the three required fields. */
const fillRequired = async (user: User): Promise<void> => {
	await user.type(
		await screen.findByRole("textbox", { name: "Full name" }),
		"Priya Nair"
	);
	await user.type(textbox("Email address"), "priya@company.com");
	await chooseDepartment(user, "Orchard › Kitchen");
};

describe("Add employee", () => {
	it("is offered on the People list to someone who may add employees, and opens the page", async () => {
		const user = userEvent.setup();
		stubApi(routes());
		const opened = await open("/people");

		await user.click(
			await screen.findByRole("button", { name: "Add employee" })
		);

		expect(
			await screen.findByRole("heading", { level: 1, name: "Add employee" })
		).toBeVisible();
		expect(opened.router.state.location.pathname).toBe("/people/new");
		expect(
			screen
				.getAllByRole("heading", { level: 2 })
				.map((heading) => heading.textContent)
		).toEqual([
			"Personal information",
			"Contact information",
			"Employment information",
			"Department & role information",
		]);
	});

	it("is offered to someone granted at one department, with only that department to choose", async () => {
		const user = userEvent.setup();
		stubApi(
			routes(
				workspaceReply(
					["branch:read", "department:read", "job_title:read"],
					["member_profile:read", "member_profile:create"]
				)
			)
		);
		await open("/people");

		await user.click(
			await screen.findByRole("button", { name: "Add employee" })
		);
		await user.click(
			await screen.findByRole("button", { name: /^Department/ })
		);

		expect(
			(await screen.findAllByRole("option")).map((option) => option.textContent)
		).toEqual(["Orchard › Kitchen"]);
	});

	it("is neither offered nor usable without the key", async () => {
		stubApi(routes(workspaceReply(["member_profile:read"])));
		await open("/people");
		await screen.findByRole("table", { name: "People" });
		expect(
			screen.queryByRole("button", { name: "Add employee" })
		).not.toBeInTheDocument();
	});

	it("explains, rather than shows the form, to someone without the key who opens the page", async () => {
		stubApi(routes(workspaceReply(["member_profile:read"])));
		await open();

		expect(
			await screen.findByText("You don’t have permission to add employees.")
		).toBeVisible();
		expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: "Confirm" })
		).not.toBeInTheDocument();
	});

	it("sends every field filled in, as the API takes it, and confirms on the list", async () => {
		const user = userEvent.setup();
		const calls = stubApi(routes());
		const opened = await open();

		await fillRequired(user);
		await pickDate(user, /^Date of birth/, "1 October 2026");
		await user.type(textbox("Phone number"), "8123 4567");
		await choose(user, /^Employment type/, "Part-time");
		await pickDate(user, /^Hire date/, "1 October 2026");
		await pickDate(user, /^Probation end date/, "30 October 2026");
		await choose(user, /^Job title/, "Chef");
		await choose(user, /^Manager/, "Marcus Lim");
		await user.click(confirm());

		expect(
			await screen.findByText(
				"Priya Nair was added. We’ve emailed them an invitation to log in."
			)
		).toHaveAttribute("role", "status");
		expect(opened.router.state.location.pathname).toBe("/people");
		expect(sent(calls, CREATE).map((call) => call.body)).toEqual([
			{
				displayName: "Priya Nair",
				email: "priya@company.com",
				jobTitleId: "j-1",
				reportsToMembershipId: "m-9",
				dateOfBirth: "2026-10-01",
				phone: "+6581234567",
				employmentType: "PART_TIME",
				hireDate: "2026-10-01",
				probationEndDate: "2026-10-30",
			},
		]);
	});

	it("assigns the chosen system role in the person's department once they are added", async () => {
		const user = userEvent.setup();
		const calls = stubApi(routes());
		await open();

		await fillRequired(user);
		await user.click(button(/^System role/));
		// The owner's role and inactive roles are never offered.
		expect(
			screen.getAllByRole("option").map((option) => option.textContent)
		).toEqual(["Supervisor"]);
		await user.click(screen.getByRole("option", { name: "Supervisor" }));
		await user.click(confirm());

		await screen.findByText(/Priya Nair was added\. /);
		expect(sent(calls, CREATE)).toHaveLength(1);
		expect(sent(calls, ASSIGN).map((call) => call.body)).toEqual([
			{ companyMembershipId: "m-new", accessRoleId: "r-1" },
		]);
	});

	it("leaves out what was left empty and assigns no role", async () => {
		const user = userEvent.setup();
		const calls = stubApi(routes());
		await open();

		await fillRequired(user);
		await user.click(confirm());

		await screen.findByText(/Priya Nair was added/);
		expect(sent(calls, CREATE).map((call) => call.body)).toEqual([
			{ displayName: "Priya Nair", email: "priya@company.com" },
		]);
		expect(sent(calls, ASSIGN)).toEqual([]);
	});

	it("says the person was added when only the role could not be assigned", async () => {
		const user = userEvent.setup();
		stubApi({
			...routes(),
			[ASSIGN]: problemReply(409, "ACCESS_ROLE_INACTIVE"),
		});
		const opened = await open();

		await fillRequired(user);
		await choose(user, /^System role/, "Supervisor");
		await user.click(confirm());

		expect(
			await screen.findByText(
				"Priya Nair was added, but their system role wasn’t assigned. Assign it from Organisation, under System roles."
			)
		).toHaveAttribute("role", "status");
		expect(opened.router.state.location.pathname).toBe("/people");
	});

	it("checks the required fields first and focuses the first one wrong", async () => {
		const user = userEvent.setup();
		const calls = stubApi(routes());
		await open();
		await screen.findByRole("button", { name: /^Department/ });

		await user.type(textbox("Email address"), "priya");
		await user.click(confirm());

		expect(
			await screen.findByText("Enter the employee’s full name.")
		).toBeVisible();
		expect(screen.getByText("Enter a valid email address.")).toBeVisible();
		expect(screen.getByText("Choose a department.")).toBeVisible();
		expect(textbox("Full name")).toHaveFocus();
		expect(sent(calls, CREATE)).toEqual([]);
	});

	it("needs the probation to end on or after the hire date, and limits its picker", async () => {
		const user = userEvent.setup();
		const calls = stubApi(routes());
		await open();
		await fillRequired(user);

		await pickDate(user, /^Probation end date/, "2 October 2026");
		await pickDate(user, /^Hire date/, "20 October 2026");
		await user.click(button(/^Probation end date/));
		expect(
			await screen.findByRole("gridcell", { name: dayOf("19 October 2026") })
		).toHaveAttribute("aria-disabled", "true");
		await user.keyboard("{Escape}");
		await user.click(confirm());

		expect(
			await screen.findByText("Choose a date on or after the hire date.")
		).toBeVisible();
		expect(sent(calls, CREATE)).toEqual([]);
	});

	it("asks for a country code before a number without one", async () => {
		const user = userEvent.setup();
		stubApi(routes());
		await open();
		await user.type(
			await screen.findByRole("textbox", { name: "Full name" }),
			"Priya Nair"
		);
		await user.type(textbox("Email address"), "priya@company.com");
		await user.type(textbox("Phone number"), "81234567");
		await chooseDepartment(user, "Orchard › Kitchen");
		await user.click(confirm());

		expect(await screen.findByText("Choose the country code.")).toBeVisible();
	});

	it("offers job titles once a department is chosen, clears them when it changes, and follows its country code", async () => {
		const user = userEvent.setup();
		stubApi(routes());
		await open();

		await screen.findByRole("button", { name: /^Department/ });
		expect(button(/^Job title/)).toBeDisabled();
		expect(screen.getByText("Choose a department first.")).toBeVisible();
		expect(button(/^Country code/)).toHaveTextContent("Code");

		await chooseDepartment(user, "Orchard › Kitchen");
		expect(button(/^Country code/)).toHaveTextContent("+65");
		await waitFor(() => {
			expect(button(/^Job title/)).toBeEnabled();
		});
		await choose(user, /^Job title/, "Chef");
		expect(button(/^Job title/)).toHaveTextContent("Chef");

		await chooseDepartment(user, "Bukit Bintang › Kitchen");
		expect(button(/^Job title/)).toHaveTextContent("Select job title");
		expect(button(/^Country code/)).toHaveTextContent("+60");
		await user.click(button(/^Job title/));
		expect(
			(await screen.findAllByRole("option")).map((option) => option.textContent)
		).toEqual(["Cook"]);
	});

	it("leaves out the manager and system role without the keys they need", async () => {
		stubApi(
			routes(
				workspaceReply([
					"member_profile:read",
					"member_profile:create",
					"branch:read",
					"department:read",
					"access_role:read",
				])
			)
		);
		await open();

		await screen.findByRole("button", { name: /^Department/ });
		expect(screen.queryByText("Manager")).not.toBeInTheDocument();
		expect(screen.queryByText("System role")).not.toBeInTheDocument();
	});

	it.each([
		[
			problemReply(409, "MEMBER_EMAIL_ALREADY_REGISTERED"),
			"This email address already has an account. Use another email address.",
			(): HTMLElement => textbox("Email address"),
		],
		[
			problemReply(404, "DEPARTMENT_NOT_FOUND"),
			"This department is no longer available. Choose another department.",
			(): HTMLElement => button(/^Department/),
		],
		[
			problemReply(409, "DEPARTMENT_INACTIVE"),
			"This department is no longer available. Choose another department.",
			(): HTMLElement => button(/^Department/),
		],
		[
			problemReply(404, "JOB_TITLE_NOT_FOUND"),
			"This job title is no longer available. Choose another job title.",
			(): HTMLElement => button(/^Job title/),
		],
		[
			problemReply(409, "JOB_TITLE_INACTIVE"),
			"This job title is no longer available. Choose another job title.",
			(): HTMLElement => button(/^Job title/),
		],
		[
			problemReply(404, "REPORTS_TO_NOT_FOUND"),
			"This person is no longer available. Choose another manager.",
			(): HTMLElement => button(/^Manager/),
		],
		[
			{
				status: 400,
				body: {
					status: 400,
					detail: "API says no",
					errors: [{ field: "phone", message: "API says bad phone" }],
				},
			},
			"Enter a valid phone number.",
			(): HTMLElement => textbox("Phone number"),
		],
	])("places a refusal on its field: %j", async (reply, message, field) => {
		const user = userEvent.setup();
		stubApi({ ...routes(), [CREATE]: reply });
		await open();
		await fillRequired(user);
		await choose(user, /^Job title/, "Chef");

		await user.click(confirm());

		await waitFor(() => {
			expect(field()).toHaveAccessibleDescription(message);
		});
		expect(field()).toHaveFocus();
		expect(screen.queryByText(/API says/)).not.toBeInTheDocument();
		expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
			"Add employee"
		);
	});

	it("reloads the options of a refused department, job title or manager", async () => {
		const user = userEvent.setup();
		const calls = stubApi({
			...routes(),
			[CREATE]: [
				problemReply(409, "DEPARTMENT_INACTIVE"),
				problemReply(404, "JOB_TITLE_NOT_FOUND"),
				problemReply(404, "REPORTS_TO_NOT_FOUND"),
			],
		});
		const count = (route: string): number => sent(calls, route).length;
		await open();
		await fillRequired(user);
		await choose(user, /^Job title/, "Chef");
		const before = {
			departments: count(`GET ${COMPANY}/departments`),
			jobTitles: count(`GET ${COMPANY}/job-titles`),
			members: count(`GET ${COMPANY}/members`),
		};

		await user.click(confirm());
		await waitFor(() => {
			expect(count(`GET ${COMPANY}/departments`)).toBe(before.departments + 1);
		});
		await user.click(confirm());
		await waitFor(() => {
			expect(count(`GET ${COMPANY}/job-titles`)).toBe(before.jobTitles + 1);
		});
		await user.click(confirm());
		await waitFor(() => {
			expect(count(`GET ${COMPANY}/members`)).toBe(before.members + 1);
		});
	});

	it.each([
		[problemReply(429, "RATE_LIMITED"), "Too many attempts. Try again later."],
		[
			problemReply(400, "IDENTITY_REJECTED"),
			"We couldn’t set up a login for this email address. Check it, or try again later.",
		],
		[
			{ status: 409, body: { status: 409 } },
			"We couldn’t add the employee. Try again.",
		],
		[
			problemReply(500, "INTERNAL_ERROR"),
			"We couldn’t add the employee. Try again.",
		],
	])(
		"explains any other refusal above the form: %j",
		async (reply, message) => {
			const user = userEvent.setup();
			stubApi({ ...routes(), [CREATE]: reply });
			await open();
			await fillRequired(user);

			await user.click(confirm());

			const alert = await screen.findByText(message);
			expect(alert).toHaveAttribute("role", "alert");
			await waitFor(() => {
				expect(alert).toHaveFocus();
			});
		}
	);

	it("explains a refusal of permission and reloads the workspace", async () => {
		const user = userEvent.setup();
		const calls = stubApi({
			...routes(),
			[CREATE]: problemReply(403, "AUTHORIZATION_DENIED"),
		});
		await open();
		await fillRequired(user);

		await user.click(confirm());

		expect(
			await screen.findByText(
				"You no longer have permission to add employees to this department."
			)
		).toHaveAttribute("role", "alert");
		await waitFor(() => {
			expect(sent(calls, WORKSPACE).length).toBeGreaterThan(1);
		});
	});

	it("can't be sent twice while sending", async () => {
		const user = userEvent.setup();
		let answer: (() => void) | undefined;
		const calls = stubApi(routes());
		const fetching = globalThis.fetch;
		vi.stubGlobal(
			"fetch",
			(url: string, init?: RequestInit): Promise<Response> =>
				init?.method === "POST" && url.includes("member-profiles")
					? new Promise<Response>((resolve) => {
							answer = (): void => {
								void fetching(url, init).then(resolve);
							};
						})
					: fetching(url, init)
		);
		await open();
		await fillRequired(user);

		await user.click(confirm());
		await waitFor(() => {
			expect(confirm()).toBeDisabled();
		});
		await user.click(confirm());
		expect(button("Cancel")).toBeDisabled();
		answer?.();

		await screen.findByText(/Priya Nair was added/);
		expect(sent(calls, CREATE)).toHaveLength(1);
	});

	it("returns to the list without saving on cancel", async () => {
		const user = userEvent.setup();
		const calls = stubApi(routes());
		const opened = await open();
		await user.type(
			await screen.findByRole("textbox", { name: "Full name" }),
			"Priya"
		);

		await user.click(button("Cancel"));

		await waitFor(() => {
			expect(opened.router.state.location.pathname).toBe("/people");
		});
		expect(screen.queryByText(/was added/)).not.toBeInTheDocument();
		expect(sent(calls, CREATE)).toEqual([]);
	});
});
