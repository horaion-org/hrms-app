import { screen, waitFor, within } from "@testing-library/react";
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
const PROFILE = `${COMPANY}/member-profiles/m-1`;
const WORKSPACE = "GET /api/v1/me/workspace";
const ASSIGN = `POST ${COMPANY}/branches/b-1/departments/d-1/access-role-assignments`;
const ASSIGN_IN_BAR = `POST ${COMPANY}/branches/b-1/departments/d-2/access-role-assignments`;
const REVOKE = `DELETE ${COMPANY}/access-role-assignments/a-1`;
const ALL = [
	"member_profile:read",
	"member_profile:update",
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
/** `company` held company-wide, `kitchen` at department d-1 only. */
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
							{ uuid: "d-2", name: "Bar", permissions: [] },
						],
					},
				],
			},
		],
	}),
});
/** Granted company-wide only the lists, and the profile keys at d-1. */
const kitchenHolder = (): StubReply =>
	workspaceReply(
		["branch:read", "department:read", "job_title:read"],
		["member_profile:read", "member_profile:update"]
	);

const kent = (
	overrides: Record<string, unknown> = {}
): Record<string, unknown> => ({
	membershipId: "m-1",
	employeeCode: "EMP-10392",
	displayName: "Kent Chua",
	email: "kent.chua@company.com",
	phone: "+6583247931",
	branchId: "b-1",
	branchName: "Orchard",
	departmentId: "d-1",
	departmentName: "Kitchen",
	jobTitleId: "j-1",
	jobTitleName: "Pastry chef",
	status: "ACTIVE",
	dateOfBirth: "1987-03-22",
	employmentType: "FULL_TIME",
	hireDate: "2024-01-15",
	probationEndDate: null,
	endDate: null,
	reportsTo: { membershipId: "m-9", displayName: "Faris Ahmad" },
	...overrides,
});
/** The body a save of Kent, unchanged, sends. */
const kentBody = {
	displayName: "Kent Chua",
	status: "ACTIVE",
	departmentId: "d-1",
	jobTitleId: "j-1",
	reportsToMembershipId: "m-9",
	dateOfBirth: "1987-03-22",
	phone: "+6583247931",
	employmentType: "FULL_TIME",
	hireDate: "2024-01-15",
	probationEndDate: null,
};
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
	holderCount: 1,
	...overrides,
});
const assignment = (
	accessRoleAssignmentId: string,
	accessRoleId: string,
	departmentId: string | null
): unknown => ({
	accessRoleAssignmentId,
	companyId: "c-1",
	companyMembershipId: "m-1",
	accessRoleId,
	scope: departmentId ? "DEPARTMENT" : "COMPANY",
	branchId: null,
	departmentId,
	status: "ACTIVE",
});

type Route =
	| StubReply
	| Array<StubReply>
	| ((call: { search: string; body: unknown }) => StubReply);

const routes = (
	workspace: StubReply = workspaceReply(ALL),
	profile: Record<string, unknown> = kent()
): Record<string, Route> => {
	// The API keeps what was saved, so reading the profile again shows it.
	let current = profile;
	const saved = (call: { body: unknown }): StubReply => {
		current = { ...current, ...(call.body as object) };
		return { status: 200, body: envelope(current) };
	};
	return {
		"POST /api/v1/public/sessions/refreshes": accessPassReply(),
		"GET /api/v1/me": currentUserReply(),
		[WORKSPACE]: workspace,
		[`GET ${COMPANY}/member-profiles`]: page([
			kent(),
			kent({
				membershipId: "m-2",
				employeeCode: "EMP-2",
				displayName: "Wei Jun",
				email: "wei.jun@company.com",
				departmentId: "d-2",
				departmentName: "Bar",
			}),
		]),
		[`GET ${PROFILE}`]: () => ({ status: 200, body: envelope(current) }),
		// Every change goes to the person's own address, wherever they are.
		[`PUT ${PROFILE}`]: saved,
		[`GET ${COMPANY}/branches`]: page([
			{
				branchId: "b-1",
				name: "Orchard",
				code: "ORC",
				city: "Singapore",
				country: "SG",
				status: "ACTIVE",
			},
		]),
		[`GET ${COMPANY}/departments`]: page([
			{
				departmentId: "d-1",
				branchId: "b-1",
				name: "Kitchen",
				status: "ACTIVE",
			},
			{ departmentId: "d-2", branchId: "b-1", name: "Bar", status: "ACTIVE" },
		]),
		[`GET ${COMPANY}/job-titles`]: page([
			{
				jobTitleId: "j-1",
				branchId: "b-1",
				branchName: "Orchard",
				departmentId: "d-1",
				departmentName: "Kitchen",
				name: "Pastry chef",
				status: "ACTIVE",
			},
		]),
		[`GET ${COMPANY}/members`]: page([
			{ membershipId: "m-9", displayName: "Faris Ahmad", status: "ACTIVE" },
		]),
		[`GET ${COMPANY}/access-roles`]: page([
			role("r-0", "Company owner", { protectedRole: true }),
			role("r-1", "Supervisor"),
			role("r-2", "Manager"),
			role("r-3", "Admin"),
		]),
		[`GET ${COMPANY}/access-role-assignments`]: {
			status: 200,
			body: envelope([
				assignment("a-1", "r-1", "d-1"),
				assignment("a-3", "r-3", null),
			]),
		},
		[ASSIGN]: { status: 201 },
		[ASSIGN_IN_BAR]: { status: 201 },
		[REVOKE]: { status: 204 },
		[`GET ${PROFILE}/skills`]: { status: 200, body: envelope([]) },
	};
};

let app: OpenedApp | undefined;
let stopRefreshing: (() => void) | undefined;
beforeEach(() => {
	vi.spyOn(window, "scrollTo").mockImplementation(() => {});
});
afterEach(() => {
	stopRefreshing?.();
	stopRefreshing = undefined;
	app?.disconnect();
	app?.queryClient.clear();
	app = undefined;
	endSession("expired");
	resetApiClient();
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
	localStorage.clear();
});

const open = async (entry = "/people/m-1"): Promise<OpenedApp> => {
	app = await openApp(entry);
	stopRefreshing = refreshWorkspaceOnRefusal(app.queryClient);
	renderAuthApp(app);
	return app;
};

type User = ReturnType<typeof userEvent.setup>;
type Call = { method: string; path: string; body?: unknown };
const sent = (calls: Array<Call>, route: string): Array<unknown> =>
	calls
		.filter((call) => `${call.method} ${call.path}` === route)
		.map((call) => call.body);
/** Anything but a read sent to `path`. */
const writesTo = (calls: Array<Call>, path: string): Array<Call> =>
	calls.filter((call) => call.path === path && call.method !== "GET");
const button = (name: RegExp | string): HTMLElement =>
	screen.getByRole("button", { name });
const textbox = (name: string): HTMLElement =>
	screen.getByRole("textbox", { name });
/** Each card's rows as "label: value". */
const rows = (card: string): Array<string> =>
	within(screen.getByRole("region", { name: card }))
		.getAllByRole("term")
		.map(
			(term) => `${term.textContent}: ${term.nextElementSibling?.textContent}`
		);
/** Opens the page ready to edit and waits for the form. */
const openEditing = async (
	reply?: Record<string, Route>
): Promise<{ opened: OpenedApp; calls: Array<Call> }> => {
	const calls = stubApi(reply ?? routes());
	const opened = await open("/people/m-1?edit=true");
	await screen.findByRole("textbox", { name: "Full name" });
	return { opened, calls };
};
const save = async (user: User): Promise<void> => {
	await user.click(button("Save changes"));
};
const choose = async (
	user: User,
	field: RegExp,
	option: string
): Promise<void> => {
	await user.click(button(field));
	await user.click(await screen.findByRole("option", { name: option }));
};
const moveToBar = async (user: User): Promise<void> => {
	// Enabled once the departments have loaded.
	await waitFor(() => {
		expect(button(/^Department/)).toBeEnabled();
	});
	await choose(user, /^Department/, "Orchard › Bar");
};

describe("A person's profile", () => {
	it("opens from the People list and shows every field, a dash for what isn't set", async () => {
		const user = userEvent.setup();
		stubApi(routes());
		const opened = await open("/people");

		await user.click(
			await screen.findByRole("link", { name: "View Kent Chua" })
		);

		// The page's code is split from the list's, and its first load in a test takes a while.
		await waitFor(
			() => {
				expect(opened.router.state.status).toBe("idle");
			},
			{ timeout: 3000 }
		);
		expect(opened.router.state.location.pathname).toBe("/people/m-1");
		expect(
			await screen.findByRole("heading", { level: 1, name: "Kent Chua" })
		).toBeVisible();
		expect(
			screen.getByRole("link", { name: "Back to people overview" })
		).toHaveAttribute("href", "/people");
		// The header's badge comes first.
		expect(screen.getAllByText("Active")[0]).toHaveClass("bg-success-100");
		expect(screen.getAllByText("EMP-10392")[0]).toBeVisible();
		expect(rows("Personal information")).toEqual([
			"Full name: Kent Chua",
			"Date of birth: 22 Mar 1987",
			"Employee ID: EMP-10392",
		]);
		expect(rows("Contact information")).toEqual([
			"Phone number: +6583247931",
			"Email address: kent.chua@company.com",
		]);
		expect(rows("Employment information")).toEqual([
			"Employment type: Full-time",
			"Hire date: 15 Jan 2024",
			"Probation end date: —",
			"Employment status: Active",
		]);
		await waitFor(() => {
			expect(rows("Department & role information")).toEqual([
				"Job title: Pastry chef",
				"Department: Kitchen",
				"Manager: Faris Ahmad",
				"System role: Supervisor, Admin",
			]);
		});
		expect(button("Copy phone number")).toBeVisible();
		expect(button("Copy email address")).toBeVisible();
		// Notes need their own key, which this person lacks; a photo is not part of this page yet.
		await waitFor(() => {
			expect(
				screen
					.getAllByRole("heading", { level: 2 })
					.map((heading) => heading.textContent)
			).toEqual([
				"Personal information",
				"Contact information",
				"Employment information",
				"Department & role information",
				"Skills & proficiency (0)",
			]);
		});
	});

	it("leaves out the system role for someone who may not read roles", async () => {
		stubApi(routes(workspaceReply(["member_profile:read"]), kent()));
		await open();

		await screen.findByRole("heading", { level: 1, name: "Kent Chua" });
		expect(rows("Department & role information")).toEqual([
			"Job title: Pastry chef",
			"Department: Kitchen",
			"Manager: Faris Ahmad",
		]);
	});

	it.each([
		problemReply(404, "MEMBER_PROFILE_NOT_FOUND"),
		problemReply(403, "AUTHORIZATION_DENIED"),
	])("says the person isn't available, never why: %j", async (reply) => {
		const calls = stubApi({ ...routes(), [`GET ${PROFILE}`]: reply });
		await open();

		expect(
			await screen.findByText(
				"This person isn’t available. They may not exist, or you may not have access to them."
			)
		).toHaveAttribute("role", "alert");
		// A 403 reloads the workspace at most once, and nothing asks again.
		const settle = (): Promise<unknown> =>
			new Promise((resolve) => {
				setTimeout(resolve, 300);
			});
		await settle();
		const reads = sent(calls, `GET ${PROFILE}`).length;
		const workspaces = sent(calls, WORKSPACE).length;
		expect(workspaces).toBeLessThanOrEqual(2);
		await settle();
		expect(sent(calls, `GET ${PROFILE}`)).toHaveLength(reads);
		expect(sent(calls, WORKSPACE)).toHaveLength(workspaces);
		expect(screen.queryByText(/API says/)).not.toBeInTheDocument();
		expect(
			screen.getByRole("link", { name: "Back to people overview" })
		).toBeVisible();
	});
});

describe("Who may edit a person", () => {
	it("is anyone granted company-wide, from the profile and the list", async () => {
		stubApi(routes());
		await open("/people");

		const table = await screen.findByRole("table", { name: "People" });
		expect(
			await within(table).findByRole("link", { name: "Edit Kent Chua" })
		).toHaveAttribute("href", "/people/m-1?edit=true");
		expect(
			within(table).getByRole("link", { name: "Edit Wei Jun" })
		).toBeVisible();
		expect(
			within(table).getByRole("link", { name: "View Wei Jun" })
		).toHaveAttribute("href", "/people/m-2");
		expect(
			within(table).getByRole("link", { name: "Kent Chua" })
		).toHaveAttribute("href", "/people/m-1");
	});

	it("is someone granted at the person's department, only for the people there", async () => {
		stubApi(routes(kitchenHolder()));
		await open("/people");

		const table = await screen.findByRole("table", { name: "People" });
		await within(table).findByRole("link", { name: "View Wei Jun" });
		expect(
			within(table).getByRole("link", { name: "Edit Kent Chua" })
		).toBeVisible();
		expect(
			within(table).queryByRole("link", { name: "Edit Wei Jun" })
		).not.toBeInTheDocument();
	});

	it("is, for a person without a department, only someone granted company-wide", async () => {
		const unfiled = {
			branchId: null,
			branchName: null,
			departmentId: null,
			departmentName: null,
		};
		stubApi({
			...routes(kitchenHolder(), kent(unfiled)),
			[`GET ${COMPANY}/member-profiles`]: page([kent(unfiled)]),
		});
		await open("/people");

		const table = await screen.findByRole("table", { name: "People" });
		await within(table).findByRole("link", { name: "View Kent Chua" });
		expect(
			within(table).queryByRole("link", { name: "Edit Kent Chua" })
		).not.toBeInTheDocument();
	});

	it("is nobody without the key: no edit, no menu, and a link to edit opens the profile read-only", async () => {
		stubApi(routes(workspaceReply(["member_profile:read"])));
		await open("/people/m-1?edit=true");

		await screen.findByRole("heading", { level: 1, name: "Kent Chua" });
		expect(
			screen.queryByRole("link", { name: "Edit profile" })
		).not.toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: /More actions/ })
		).not.toBeInTheDocument();
		expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
	});
});

describe("Editing a person", () => {
	it("opens from Edit profile, linkable, with every field filled in and the employee ID fixed", async () => {
		const user = userEvent.setup();
		stubApi(routes());
		const opened = await open();

		await user.click(await screen.findByRole("link", { name: "Edit profile" }));

		expect(
			await screen.findByRole("textbox", { name: "Full name" })
		).toHaveValue("Kent Chua");
		expect(opened.router.state.location.search).toEqual({ edit: true });
		expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
			"Kent Chua"
		);
		expect(textbox("Employee ID")).toHaveValue("EMP-10392");
		expect(textbox("Employee ID")).toBeDisabled();
		expect(button(/^Date of birth/)).toHaveTextContent("22 Mar 1987");
		expect(button(/^Country code/)).toHaveTextContent("+65");
		expect(textbox("Phone number")).toHaveValue("83247931");
		expect(button(/^Employment type/)).toHaveTextContent("Full-time");
		expect(button(/^Hire date/)).toHaveTextContent("15 Jan 2024");
		expect(button(/^Probation end date/)).toHaveTextContent("Select date");
		expect(button(/^Employment status/)).toHaveTextContent("Active");
		expect(button(/^Department/)).toHaveTextContent("Orchard › Kitchen");
		await waitFor(() => {
			expect(button(/^Job title/)).toHaveTextContent("Pastry chef");
		});
		expect(button(/^Manager/)).toHaveTextContent("Faris Ahmad");
		expect(button(/^System role/)).toHaveTextContent("Supervisor");
		expect(screen.getByText("Also holds elsewhere: Admin.")).toBeVisible();
	});

	it("shows the email address but never changes it here", async () => {
		stubApi(routes());
		await open("/people/m-1?edit=true");

		const email = await screen.findByRole("textbox", { name: "Email address" });
		expect(email).toHaveValue("kent.chua@company.com");
		expect(email).toBeDisabled();
		expect(email).toHaveAccessibleDescription(
			"The email address can’t be changed here."
		);
	});

	it("saves a typical edit to the person's address for someone granted company-wide, and shows the saved profile", async () => {
		const user = userEvent.setup();
		const { opened, calls } = await openEditing();

		await user.clear(textbox("Full name"));
		await user.type(textbox("Full name"), " Kent Tan ");
		await choose(user, /^Employment type/, "Part-time");
		await choose(user, /^Employment status/, "Inactive");
		await save(user);

		expect(
			await screen.findByText("Changes to Kent Tan were saved.")
		).toHaveAttribute("role", "status");
		expect(opened.router.state.location.search).toEqual({});
		expect(
			screen.getByRole("heading", { level: 1, name: "Kent Tan" })
		).toBeVisible();
		expect(sent(calls, `PUT ${PROFILE}`)).toEqual([
			{
				...kentBody,
				displayName: "Kent Tan",
				employmentType: "PART_TIME",
				status: "INACTIVE",
			},
		]);
		// The role was left as it was.
		expect(sent(calls, ASSIGN)).toEqual([]);
		expect(sent(calls, REVOKE)).toEqual([]);
	});

	it("files a person who has no department in the one chosen, which is required", async () => {
		const user = userEvent.setup();
		const { calls } = await openEditing(
			routes(
				workspaceReply(ALL.filter((key) => !key.startsWith("access_role"))),
				kent({
					branchId: null,
					branchName: null,
					departmentId: null,
					departmentName: null,
					jobTitleId: null,
					jobTitleName: null,
				})
			)
		);

		await save(user);
		expect(await screen.findByText("Choose a department.")).toBeVisible();
		expect(writesTo(calls, PROFILE)).toEqual([]);

		// Granted company-wide, they may file them in any active department.
		await waitFor(() => {
			expect(button(/^Department/)).toBeEnabled();
		});
		await user.click(button(/^Department/));
		expect(
			(await screen.findAllByRole("option")).map((option) => option.textContent)
		).toEqual(["Orchard › Kitchen", "Orchard › Bar"]);
		await user.keyboard("{Escape}");
		await moveToBar(user);
		await save(user);

		await screen.findByText("Changes to Kent Chua were saved.");
		expect(sent(calls, `PUT ${PROFILE}`)).toEqual([
			{ ...kentBody, departmentId: "d-2", jobTitleId: null },
		]);
	});

	it("never offers to leave a person without a department", async () => {
		const user = userEvent.setup();
		await openEditing();

		await waitFor(() => {
			expect(button(/^Department/)).toBeEnabled();
		});
		await user.click(button(/^Department/));
		expect(
			(await screen.findAllByRole("option")).map((option) => option.textContent)
		).toEqual(["Orchard › Kitchen", "Orchard › Bar"]);
	});

	it("saves the same way for someone granted only at the department, who can't move people elsewhere", async () => {
		const user = userEvent.setup();
		const { calls } = await openEditing(routes(kitchenHolder()));

		await waitFor(() => {
			expect(button(/^Department/)).toBeEnabled();
		});
		await user.click(button(/^Department/));
		expect(
			(await screen.findAllByRole("option")).map((option) => option.textContent)
		).toEqual(["Orchard › Kitchen"]);
		await user.keyboard("{Escape}");
		// Without the keys for them, the manager and system role are left out.
		expect(screen.queryByText("System role")).not.toBeInTheDocument();
		await choose(user, /^Employment type/, "Contract");
		await save(user);

		await screen.findByText("Changes to Kent Chua were saved.");
		expect(sent(calls, `PUT ${PROFILE}`)).toEqual([
			{ ...kentBody, employmentType: "CONTRACT" },
		]);
	});

	it("returns to the profile on cancel, asking first only if something changed", async () => {
		const user = userEvent.setup();
		const { opened, calls } = await openEditing();

		await user.click(button("Cancel"));
		await waitFor(() => {
			expect(opened.router.state.location.search).toEqual({});
		});
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

		await user.click(await screen.findByRole("link", { name: "Edit profile" }));
		await user.type(
			await screen.findByRole("textbox", { name: "Full name" }),
			"x"
		);
		await user.click(button("Cancel"));
		const dialog = await screen.findByRole("dialog", {
			name: "Discard your changes?",
		});
		expect(dialog).toHaveTextContent(
			"Your changes to Kent Chua won’t be saved."
		);
		await user.click(
			within(dialog).getByRole("button", { name: "Keep editing" })
		);
		expect(textbox("Full name")).toHaveValue("Kent Chuax");

		await user.click(button("Cancel"));
		await user.click(
			await screen.findByRole("button", { name: "Discard changes" })
		);
		await waitFor(() => {
			expect(opened.router.state.location.search).toEqual({});
		});
		expect(
			await screen.findByRole("heading", { level: 1, name: "Kent Chua" })
		).toBeVisible();
		expect(sent(calls, `PUT ${PROFILE}`)).toEqual([]);
	});

	it.each([
		[
			problemReply(409, "IDENTITY_SHARED_ACROSS_COMPANIES"),
			"This name can’t be changed here because they also belong to another company.",
			(): HTMLElement => textbox("Full name"),
		],
		[
			problemReply(409, "CANNOT_DEACTIVATE_SELF"),
			"You can’t deactivate yourself.",
			(): HTMLElement => button(/^Employment status/),
		],
		[
			problemReply(409, "COMPANY_OWNER_CANNOT_BE_DEACTIVATED"),
			"The company owner can’t be deactivated.",
			(): HTMLElement => button(/^Employment status/),
		],
		[
			problemReply(400, "REPORTS_TO_SELF"),
			"They can’t be their own manager. Choose someone else.",
			(): HTMLElement => button(/^Manager/),
		],
	])("places a refusal on its field: %j", async (reply, message, field) => {
		const user = userEvent.setup();
		await openEditing({ ...routes(), [`PUT ${PROFILE}`]: reply });

		await save(user);

		await waitFor(() => {
			expect(field()).toHaveAccessibleDescription(message);
		});
		expect(field()).toHaveFocus();
		expect(screen.queryByText(/API says/)).not.toBeInTheDocument();
	});

	it.each([
		[
			problemReply(409, "LAST_ACTIVE_DEPARTMENT_HEAD"),
			"They’re the only head of their department. Add another head there first.",
		],
		[
			problemReply(403, "AUTHORIZATION_DENIED"),
			"You don’t have permission to move people to this department.",
		],
		[
			problemReply(400, "INVALID_DEPARTMENT_MEMBER"),
			"They’re inactive. Reactivate them before moving them to another department.",
		],
	])(
		"places a refusal of a move on the department: %j",
		async (reply, message) => {
			const user = userEvent.setup();
			await openEditing({ ...routes(), [`PUT ${PROFILE}`]: reply });

			await moveToBar(user);
			await save(user);

			await waitFor(() => {
				expect(button(/^Department/)).toHaveAccessibleDescription(message);
			});
		}
	);

	it.each([
		[
			problemReply(409, "LAST_ACTIVE_DEPARTMENT_HEAD"),
			"They’re the only head of their department. Add another head there first.",
		],
		[
			problemReply(404, "MEMBER_PROFILE_NOT_FOUND"),
			"This person is no longer available.",
		],
		[
			problemReply(409, "MEMBER_PROFILE_MOVED"),
			"They were moved to another department while you were working. Reload the page and try again.",
		],
		[problemReply(429, "RATE_LIMITED"), "Too many attempts. Try again later."],
		[
			problemReply(500, "INTERNAL_ERROR"),
			"We couldn’t save the changes. Try again.",
		],
	])(
		"explains any other refusal above the form: %j",
		async (reply, message) => {
			const user = userEvent.setup();
			await openEditing({ ...routes(), [`PUT ${PROFILE}`]: reply });

			await save(user);

			const alert = await screen.findByText(message);
			expect(alert).toHaveAttribute("role", "alert");
			await waitFor(() => {
				expect(alert).toHaveFocus();
			});
		}
	);

	it("explains a refusal of permission and reloads the workspace", async () => {
		const user = userEvent.setup();
		const { calls } = await openEditing({
			...routes(),
			[`PUT ${PROFILE}`]: problemReply(403, "AUTHORIZATION_DENIED"),
		});

		await save(user);

		expect(
			await screen.findByText(
				"You no longer have permission to edit this person."
			)
		).toHaveAttribute("role", "alert");
		await waitFor(() => {
			expect(sent(calls, WORKSPACE).length).toBeGreaterThan(1);
		});
	});
});

describe("Changing a person's system role", () => {
	it("replaces the role at their department after the profile is saved, leaving roles elsewhere alone", async () => {
		const user = userEvent.setup();
		const { calls } = await openEditing();

		await choose(user, /^System role/, "Manager");
		await save(user);

		await screen.findByText("Changes to Kent Chua were saved.");
		expect(
			calls
				.filter(
					(call) => call.method !== "GET" && call.path.startsWith(COMPANY)
				)
				.map((call) => `${call.method} ${call.path}`)
		).toEqual([`PUT ${PROFILE}`, ASSIGN, REVOKE]);
		expect(sent(calls, ASSIGN)).toEqual([
			{ companyMembershipId: "m-1", accessRoleId: "r-2" },
		]);
	});

	it("moves the role with them to a new department", async () => {
		const user = userEvent.setup();
		const { calls } = await openEditing();

		await moveToBar(user);
		await save(user);

		await screen.findByText("Changes to Kent Chua were saved.");
		expect(sent(calls, `PUT ${PROFILE}`)).toEqual([
			{ ...kentBody, departmentId: "d-2", jobTitleId: null },
		]);
		expect(sent(calls, ASSIGN_IN_BAR)).toEqual([
			{ companyMembershipId: "m-1", accessRoleId: "r-1" },
		]);
		expect(sent(calls, REVOKE)).toHaveLength(1);
	});

	it("says the profile was saved when only the role couldn't be changed, and keeps the old role", async () => {
		const user = userEvent.setup();
		const { calls } = await openEditing({
			...routes(),
			[ASSIGN]: problemReply(409, "ACCESS_ROLE_INACTIVE"),
		});

		await choose(user, /^System role/, "Manager");
		await save(user);

		expect(
			await screen.findByText(
				"Changes to Kent Chua were saved, but their system role wasn’t changed. Change it from Organisation, under System roles."
			)
		).toHaveAttribute("role", "status");
		expect(sent(calls, REVOKE)).toEqual([]);
	});
});

describe("Deactivating and reactivating", () => {
	it("deactivates after saying what it does, sending only the status changed", async () => {
		const user = userEvent.setup();
		const calls = stubApi(routes());
		await open();

		await user.click(
			await screen.findByRole("button", { name: "More actions for Kent Chua" })
		);
		expect(
			screen.getAllByRole("menuitem").map((item) => item.textContent)
		).toEqual(["Deactivate"]);
		await user.click(screen.getByRole("menuitem", { name: "Deactivate" }));
		const dialog = await screen.findByRole("dialog", {
			name: "Deactivate Kent Chua?",
		});
		expect(dialog).toHaveTextContent(
			"Kent Chua will lose access to Horaion immediately and won’t be able to log in until they’re reactivated."
		);
		await user.click(
			within(dialog).getByRole("button", { name: "Deactivate" })
		);

		expect(
			await screen.findByText(
				"Kent Chua was deactivated and can no longer log in."
			)
		).toHaveAttribute("role", "status");
		expect(sent(calls, `PUT ${PROFILE}`)).toEqual([
			{ ...kentBody, status: "INACTIVE" },
		]);
		// The header's badge comes first.
		expect(screen.getAllByText("Inactive")[0]).toHaveClass("bg-neutral-400");
	});

	it("reactivates an inactive person for someone granted at their department", async () => {
		const user = userEvent.setup();
		const calls = stubApi(
			routes(kitchenHolder(), kent({ status: "INACTIVE" }))
		);
		await open();

		await user.click(
			await screen.findByRole("button", { name: "More actions for Kent Chua" })
		);
		await user.click(screen.getByRole("menuitem", { name: "Reactivate" }));
		await user.click(
			within(
				await screen.findByRole("dialog", { name: "Reactivate Kent Chua?" })
			).getByRole("button", { name: "Reactivate" })
		);

		await screen.findByText("Kent Chua was reactivated and can log in again.");
		expect(sent(calls, `PUT ${PROFILE}`)).toEqual([
			{ ...kentBody, status: "ACTIVE" },
		]);
	});

	it("explains a refused deactivation in the dialog", async () => {
		const user = userEvent.setup();
		stubApi({
			...routes(),
			[`PUT ${PROFILE}`]: problemReply(409, "LAST_ACTIVE_DEPARTMENT_HEAD"),
		});
		await open();

		await user.click(
			await screen.findByRole("button", { name: "More actions for Kent Chua" })
		);
		await user.click(screen.getByRole("menuitem", { name: "Deactivate" }));
		const dialog = await screen.findByRole("dialog");
		await user.click(
			within(dialog).getByRole("button", { name: "Deactivate" })
		);

		expect(
			await within(dialog).findByText(
				"They’re the only head of their department. Add another head there first."
			)
		).toHaveAttribute("role", "alert");
	});

	it("offers the actions for a person without a department to someone granted company-wide", async () => {
		const user = userEvent.setup();
		const unfiled = kent({
			branchId: null,
			branchName: null,
			departmentId: null,
			departmentName: null,
		});
		stubApi(routes(workspaceReply(ALL), unfiled));
		await open();

		await screen.findByRole("link", { name: "Edit profile" });
		await user.click(
			screen.getByRole("button", { name: "More actions for Kent Chua" })
		);
		expect(
			screen.getAllByRole("menuitem").map((item) => item.textContent)
		).toEqual(["Deactivate"]);
	});

	it("offers nothing for a person without a department to someone granted only at a department", async () => {
		stubApi(
			routes(
				workspaceReply(
					["member_profile:read"],
					["member_profile:read", "member_profile:update"]
				),
				kent({
					branchId: null,
					branchName: null,
					departmentId: null,
					departmentName: null,
				})
			)
		);
		await open();

		await screen.findByRole("heading", { level: 1, name: "Kent Chua" });
		expect(
			screen.queryByRole("link", { name: "Edit profile" })
		).not.toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: /More actions/ })
		).not.toBeInTheDocument();
	});

	it("never offers to deactivate yourself", async () => {
		stubApi({
			...routes(workspaceReply(ALL), kent({ membershipId: "m-c-1" })),
			[`GET ${COMPANY}/member-profiles/m-c-1`]: {
				status: 200,
				body: envelope(kent({ membershipId: "m-c-1" })),
			},
		});
		await open("/people/m-c-1");

		await screen.findByRole("link", { name: "Edit profile" });
		expect(
			screen.queryByRole("button", { name: /More actions/ })
		).not.toBeInTheDocument();
	});

});
