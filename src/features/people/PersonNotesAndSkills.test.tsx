import { fireEvent, screen, waitFor, within } from "@testing-library/react";
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
const NOTES = `GET ${PROFILE}/notes`;
const SKILLS = `GET ${PROFILE}/skills`;
const SAVE_SKILLS = `PUT ${PROFILE}/skills`;
const SUGGESTIONS = `GET ${COMPANY}/skills`;
const NOTE_KEYS = [
	"member_note:read",
	"member_note:create",
	"member_note:update",
	"member_note:delete",
];

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
						status: "ACTIVE",
						country: "SG",
						permissions: [],
						departments: [
							{
								uuid: "d-1",
								name: "Kitchen",
								status: "ACTIVE",
								permissions: kitchen,
							},
							{ uuid: "d-2", name: "Bar", status: "ACTIVE", permissions: [] },
						],
					},
				],
			},
		],
	}),
});
/** Reads profiles company-wide; `kitchen` adds keys at department d-1. */
const reader = (kitchen: Array<string> = []): StubReply =>
	workspaceReply(["member_profile:read"], kitchen);
/** May edit profiles at d-1, with the lists the form needs. */
const editor = (kitchen: Array<string> = []): StubReply =>
	workspaceReply(
		["member_profile:read", "branch:read", "department:read", "job_title:read"],
		["member_profile:update", ...kitchen]
	);

const kent = (
	overrides: Record<string, unknown> = {}
): Record<string, unknown> => ({
	membershipId: "m-1",
	employeeCode: "EMP-10392",
	displayName: "Kent Chua",
	email: "kent.chua@company.com",
	phone: null,
	branchId: "b-1",
	branchName: "Orchard",
	departmentId: "d-1",
	departmentName: "Kitchen",
	jobTitleId: null,
	jobTitleName: null,
	status: "ACTIVE",
	dateOfBirth: null,
	employmentType: null,
	hireDate: null,
	probationEndDate: null,
	endDate: null,
	reportsTo: null,
	invitationPending: false,
	...overrides,
});
const unfiled = kent({
	branchId: null,
	branchName: null,
	departmentId: null,
	departmentName: null,
});
/** Local times, so the page shows them as written whatever the machine's zone. */
const at = (day: number, hour: number, minute: number): string =>
	new Date(2026, 4, day, hour, minute).toISOString();
const note = (
	noteId: string,
	body: string,
	overrides: Record<string, unknown> = {}
): unknown => ({
	noteId,
	body,
	author: { membershipId: "m-9", displayName: "Faris Ahmad" },
	createdAt: at(16, 22, 36),
	updatedAt: at(16, 22, 36),
	edited: false,
	...overrides,
});
const NOTE_1 = note("n-1", "Reliable and punctual.\nGreat with pastry.");
const NOTE_2 = note("n-2", "Needs help at peak hours.", {
	author: { membershipId: "m-8", displayName: null },
	createdAt: at(5, 9, 25),
	edited: true,
});
const page = (content: Array<unknown>, total = content.length): StubReply => ({
	status: 200,
	body: envelope({ content, page: { totalElements: total } }),
});
const SKILL_SET = [
	{ skillId: "s-1", name: "Baking", proficiency: 8 },
	{ skillId: "s-2", name: "Food safety", proficiency: 7 },
];

type Route =
	| StubReply
	| Array<StubReply>
	| ((call: { search: string; body: unknown }) => StubReply);

const routes = (
	workspace: StubReply,
	profile: Record<string, unknown> = kent()
): Record<string, Route> => ({
	"POST /api/v1/public/sessions/refreshes": accessPassReply(),
	"GET /api/v1/me": currentUserReply(),
	"GET /api/v1/me/workspace": workspace,
	[`GET ${PROFILE}`]: { status: 200, body: envelope(profile) },
	[`PUT ${PROFILE}`]: (call) => ({
		status: 200,
		body: envelope({ ...profile, ...(call.body as object) }),
	}),
	[NOTES]: page([NOTE_1, NOTE_2]),
	[`POST ${PROFILE}/notes`]: { status: 201, body: envelope(NOTE_1) },
	[`PUT ${PROFILE}/notes/n-1`]: { status: 200, body: envelope(NOTE_1) },
	[`DELETE ${PROFILE}/notes/n-1`]: { status: 204 },
	[SKILLS]: { status: 200, body: envelope(SKILL_SET) },
	[SAVE_SKILLS]: (call) => ({
		status: 200,
		body: envelope(
			(call.body as { skills: Array<{ name: string }> }).skills.map(
				(skill, index) => ({ skillId: `s-${index}`, ...skill })
			)
		),
	}),
	[SUGGESTIONS]: (call): StubReply => {
		const search = new URLSearchParams(call.search).get("search") ?? "";
		return page(
			[
				{ skillId: "s-1", name: "Baking" },
				{ skillId: "s-3", name: "Pastry art" },
			].filter(({ name }) => name.toLowerCase().includes(search.toLowerCase()))
		);
	},
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
		{ departmentId: "d-1", branchId: "b-1", name: "Kitchen", status: "ACTIVE" },
	]),
	[`GET ${COMPANY}/job-titles`]: page([]),
});

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

type Call = { method: string; path: string; search: string; body?: unknown };
/** What the stubbed API received in the current test. */
let received: Array<Call> = [];
const open = async (
	reply: Record<string, Route>,
	entry = "/people/m-1"
): Promise<Array<Call>> => {
	const calls = stubApi(reply);
	received = calls;
	app = await openApp(entry);
	stopRefreshing = refreshWorkspaceOnRefusal(app.queryClient);
	renderAuthApp(app);
	await screen.findByRole("heading", { level: 1, name: "Kent Chua" });
	return calls;
};
const sent = (calls: Array<Call>, route: string): Array<unknown> =>
	calls
		.filter((call) => `${call.method} ${call.path}` === route)
		.map((call) => call.body);
const card = (name: RegExp): HTMLElement =>
	screen.getByRole("region", { name });
const findCard = (name: RegExp): Promise<HTMLElement> =>
	screen.findByRole("region", { name });
const WHEN_1 = "16 May 2026, 22:36";
const WHEN_2 = "5 May 2026, 09:25";

describe("A person's notes", () => {
	it("are left out, and never asked for, without the key to read them", async () => {
		const calls = await open(routes(editor()));

		await findCard(/^Skills & proficiency/);
		expect(screen.queryByRole("region", { name: /^Notes/ })).toBeNull();
		expect(calls.some((call) => call.path.endsWith("/notes"))).toBe(false);
	});

	it("shows the count and each note with its author and time, read-only with only the read key at the department", async () => {
		const calls = await open(routes(reader(["member_note:read"])));

		const notes = await findCard(/^Notes \(2\)$/);
		const items = within(notes).getAllByRole("listitem");
		expect(items.map((item) => item.textContent)).toEqual([
			`Reliable and punctual.\nGreat with pastry.Added by Faris Ahmad•${WHEN_1}`,
			`Needs help at peak hours.Added by an unknown person•${WHEN_2}•Edited`,
		]);
		expect(within(notes).getByText(/^Reliable/)).toHaveClass(
			"whitespace-pre-wrap"
		);
		expect(within(notes).queryByRole("button")).toBeNull();
		expect(calls.find((call) => call.path === `${PROFILE}/notes`)?.search).toBe(
			"page=0&size=20"
		);
	});

	it("loads the next page on request, until every note is shown", async () => {
		const user = userEvent.setup();
		const calls = await open({
			...routes(reader(["member_note:read"])),
			[NOTES]: (call) =>
				new URLSearchParams(call.search).get("page") === "0"
					? page([NOTE_1, NOTE_2], 3)
					: page([note("n-3", "Third note.")], 3),
		});

		const notes = await findCard(/^Notes \(3\)$/);
		await within(notes).findByText("Needs help at peak hours.");
		expect(within(notes).queryByText("Third note.")).toBeNull();
		await user.click(within(notes).getByRole("button", { name: "Show more" }));

		expect(await within(notes).findByText("Third note.")).toBeVisible();
		expect(
			within(notes).queryByRole("button", { name: "Show more" })
		).toBeNull();
		expect(
			calls
				.filter((call) => call.path === `${PROFILE}/notes`)
				.map((call) => call.search)
		).toEqual(["page=0&size=20", "page=1&size=20"]);
	});

	it("adds a note to the person's address, trimmed with its line breaks, and reloads the list", async () => {
		const user = userEvent.setup();
		const calls = await open(
			routes(reader(["member_note:read", "member_note:create"]))
		);

		const notes = await findCard(/^Notes \(2\)$/);
		await user.click(within(notes).getByRole("button", { name: "Add note" }));
		const dialog = await screen.findByRole("dialog", { name: "Add note" });
		const field = within(dialog).getByRole("textbox", { name: "Note" });
		await user.type(field, "  First line{Enter}Second line  ");
		expect(within(dialog).getByText("26/1000")).toBeVisible();
		await user.click(within(dialog).getByRole("button", { name: "Add note" }));

		await waitFor(() => {
			expect(screen.queryByRole("dialog")).toBeNull();
		});
		expect(sent(calls, `POST ${PROFILE}/notes`)).toEqual([
			{ body: "First line\nSecond line" },
		]);
		expect(sent(calls, NOTES).length).toBeGreaterThan(1);
		// Without their keys, a note offers nothing.
		expect(
			within(notes).queryByRole("button", { name: /More actions/ })
		).toBeNull();
	});

	it("edits from each note's menu when read, prefilled, sending the rewritten note", async () => {
		const user = userEvent.setup();
		const calls = await open(routes(reader(NOTE_KEYS)));

		const notes = await findCard(/^Notes \(2\)$/);
		await user.click(
			within(notes).getByRole("button", {
				name: `More actions for the note from ${WHEN_1}`,
			})
		);
		expect(
			screen.getAllByRole("menuitem").map((item) => item.textContent)
		).toEqual(["Edit", "Delete"]);
		await user.click(screen.getByRole("menuitem", { name: "Edit" }));
		const dialog = await screen.findByRole("dialog", { name: "Edit note" });
		const field = within(dialog).getByRole("textbox", { name: "Note" });
		expect(field).toHaveValue("Reliable and punctual.\nGreat with pastry.");
		await user.clear(field);
		await user.type(field, "Reliable.");
		await user.click(
			within(dialog).getByRole("button", { name: "Save changes" })
		);

		await waitFor(() => {
			expect(sent(calls, `PUT ${PROFILE}/notes/n-1`)).toEqual([
				{ body: "Reliable." },
			]);
		});
	});

	it("offers only the actions whose key is held at the department", async () => {
		const user = userEvent.setup();
		await open(
			routes(
				workspaceReply(
					["member_profile:read", "member_note:read", "member_note:delete"],
					["member_note:update"]
				)
			)
		);

		const notes = await findCard(/^Notes \(2\)$/);
		await user.click(
			within(notes).getByRole("button", {
				name: `More actions for the note from ${WHEN_1}`,
			})
		);
		// Delete is held company-wide, which reaches the department too.
		expect(
			screen.getAllByRole("menuitem").map((item) => item.textContent)
		).toEqual(["Edit", "Delete"]);
	});

	it("shows edit and delete buttons instead of a menu while the profile is edited, and deletes once asked", async () => {
		const user = userEvent.setup();
		const calls = await open(
			routes(editor(NOTE_KEYS)),
			"/people/m-1?edit=true"
		);

		const notes = await findCard(/^Notes \(2\)$/);
		expect(
			within(notes).queryByRole("button", { name: /More actions/ })
		).toBeNull();
		expect(
			within(notes).getByRole("button", {
				name: `Edit the note from ${WHEN_1}`,
			})
		).toBeVisible();
		await user.click(
			within(notes).getByRole("button", {
				name: `Delete the note from ${WHEN_1}`,
			})
		);
		const dialog = await screen.findByRole("dialog", {
			name: "Delete this note?",
		});
		expect(dialog).toHaveTextContent(
			"The note will be removed from Kent Chua’s profile. This can’t be undone."
		);
		await user.click(
			within(dialog).getByRole("button", { name: "Delete note" })
		);

		await waitFor(() => {
			expect(screen.queryByRole("dialog")).toBeNull();
		});
		expect(sent(calls, `DELETE ${PROFILE}/notes/n-1`)).toHaveLength(1);
		// Still editing: deleting a note is not part of the profile's save.
		expect(screen.getByRole("button", { name: "Save changes" })).toBeVisible();
	});

	it("places a rejected note on its field and anything else as the dialog's alert", async () => {
		const user = userEvent.setup();
		await open({
			...routes(reader(NOTE_KEYS)),
			[`POST ${PROFILE}/notes`]: {
				status: 400,
				body: {
					status: 400,
					title: "Refused",
					detail: "API says no",
					errors: [{ field: "body", message: "API says no" }],
				},
			},
			[`PUT ${PROFILE}/notes/n-1`]: problemReply(404, "MEMBER_NOTE_NOT_FOUND"),
		});

		const notes = await findCard(/^Notes \(2\)$/);
		await user.click(within(notes).getByRole("button", { name: "Add note" }));
		const adding = await screen.findByRole("dialog", { name: "Add note" });
		await user.type(within(adding).getByRole("textbox"), "Hello");
		await user.click(within(adding).getByRole("button", { name: "Add note" }));
		await waitFor(() => {
			expect(within(adding).getByRole("textbox")).toHaveAccessibleDescription(
				"Check the note and try again."
			);
		});
		await user.click(within(adding).getByRole("button", { name: "Cancel" }));

		await user.click(
			within(notes).getByRole("button", {
				name: `More actions for the note from ${WHEN_1}`,
			})
		);
		await user.click(screen.getByRole("menuitem", { name: "Edit" }));
		const dialog = await screen.findByRole("dialog", { name: "Edit note" });
		await user.click(
			within(dialog).getByRole("button", { name: "Save changes" })
		);
		expect(
			await within(dialog).findByText("This note no longer exists.")
		).toHaveAttribute("role", "alert");
		expect(screen.queryByText(/API says/)).toBeNull();
	});

	it("can be added to and changed for a person without a department, with the keys company-wide", async () => {
		const user = userEvent.setup();
		const calls = await open(
			routes(workspaceReply(["member_profile:read", ...NOTE_KEYS]), unfiled)
		);

		const notes = await findCard(/^Notes \(2\)$/);
		expect(
			within(notes).getByRole("button", {
				name: `More actions for the note from ${WHEN_1}`,
			})
		).toBeVisible();
		await user.click(within(notes).getByRole("button", { name: "Add note" }));
		const dialog = await screen.findByRole("dialog", { name: "Add note" });
		await user.type(within(dialog).getByRole("textbox"), "Hello");
		await user.click(within(dialog).getByRole("button", { name: "Add note" }));

		await waitFor(() => {
			expect(sent(calls, `POST ${PROFILE}/notes`)).toEqual([{ body: "Hello" }]);
		});
	});

	it("are left out for a person without a department when the keys are held only at a department", async () => {
		const calls = await open(routes(reader(NOTE_KEYS), unfiled));

		await findCard(/^Skills & proficiency/);
		expect(screen.queryByRole("region", { name: /^Notes/ })).toBeNull();
		expect(calls.some((call) => call.path.endsWith("/notes"))).toBe(false);
	});

	it("are left out when the API refuses them, reloading the workspace without asking again", async () => {
		const calls = await open({
			...routes(reader(NOTE_KEYS)),
			[NOTES]: problemReply(403, "AUTHORIZATION_DENIED"),
		});

		await findCard(/^Skills & proficiency/);
		await waitFor(() => {
			expect(screen.queryByRole("region", { name: /^Notes/ })).toBeNull();
		});
		await waitFor(() => {
			expect(sent(calls, "GET /api/v1/me/workspace").length).toBe(2);
		});
		await new Promise((resolve) => {
			setTimeout(resolve, 300);
		});
		expect(sent(calls, NOTES)).toHaveLength(1);
		expect(sent(calls, "GET /api/v1/me/workspace")).toHaveLength(2);
	});
});

describe("A person's skills", () => {
	it("are shown to anyone who can see the profile, each as a meter with a text alternative, read-only without the update key", async () => {
		await open(routes(reader()));

		const skills = await findCard(/^Skills & proficiency \(2\)$/);
		expect(
			within(skills)
				.getAllByRole("img")
				.map((meter) => meter.getAttribute("aria-label"))
		).toEqual(["Baking: 8 out of 10", "Food safety: 7 out of 10"]);
		expect(within(skills).getByText("8/10")).toBeVisible();
		expect(
			within(skills)
				.getAllByRole("columnheader")
				.map((cell) => cell.textContent)
		).toEqual(["Skill", "Proficiency"]);
		expect(within(skills).queryByRole("button")).toBeNull();
	});

	it("says when there are none", async () => {
		await open({
			...routes(reader()),
			[SKILLS]: { status: 200, body: envelope([]) },
		});

		const skills = await findCard(/^Skills & proficiency \(0\)$/);
		expect(within(skills).getByText("No skills yet.")).toBeVisible();
	});

	const openAddSkill = async (
		user: ReturnType<typeof userEvent.setup>
	): Promise<HTMLElement> => {
		const skills = await findCard(/^Skills & proficiency \(2\)$/);
		await user.click(within(skills).getByRole("button", { name: "Add skill" }));
		return screen.findByRole("dialog", { name: "Add skill" });
	};
	const pick = async (
		user: ReturnType<typeof userEvent.setup>,
		dialog: HTMLElement,
		typed: string,
		option: string
	): Promise<void> => {
		await user.click(within(dialog).getByRole("button", { name: /^Skill/ }));
		await user.type(
			await screen.findByRole("combobox", { name: "Search or type a skill" }),
			typed
		);
		// The company's names are searched once typing pauses.
		await waitFor(() => {
			expect(
				received.some(
					(call) =>
						call.path === `${COMPANY}/skills` &&
						new URLSearchParams(call.search).get("search") === typed
				)
			).toBe(true);
		});
		await user.click(await screen.findByRole("option", { name: option }));
	};

	it("adds one of the company's skills, sending the complete set", async () => {
		const user = userEvent.setup();
		const calls = await open(routes(editor()));

		const dialog = await openAddSkill(user);
		await pick(user, dialog, "past", "Pastry art");
		fireEvent.change(
			within(dialog).getByRole("slider", { name: "Proficiency" }),
			{
				target: { value: "7" },
			}
		);
		expect(within(dialog).getByRole("slider")).toHaveAttribute(
			"aria-valuetext",
			"7 out of 10"
		);
		await user.click(within(dialog).getByRole("button", { name: "Add skill" }));

		await waitFor(() => {
			expect(screen.queryByRole("dialog")).toBeNull();
		});
		expect(sent(calls, SAVE_SKILLS)).toEqual([
			{
				skills: [
					{ name: "Baking", proficiency: 8 },
					{ name: "Food safety", proficiency: 7 },
					{ name: "Pastry art", proficiency: 7 },
				],
			},
		]);
		expect(await findCard(/^Skills & proficiency \(3\)$/)).toBeVisible();
	});

	it("adds a brand-new name as typed", async () => {
		const user = userEvent.setup();
		const calls = await open(routes(editor()));

		const dialog = await openAddSkill(user);
		await pick(user, dialog, "Latte art", "Add “Latte art”");
		expect(
			within(dialog).getByRole("button", { name: /^Skill/ })
		).toHaveTextContent("Latte art");
		await user.click(within(dialog).getByRole("button", { name: "Add skill" }));

		await waitFor(() => {
			expect(sent(calls, SAVE_SKILLS)).toEqual([
				{
					skills: [
						{ name: "Baking", proficiency: 8 },
						{ name: "Food safety", proficiency: 7 },
						{ name: "Latte art", proficiency: 5 },
					],
				},
			]);
		});
	});

	it("never adds a skill they already have", async () => {
		const user = userEvent.setup();
		const calls = await open(routes(editor()));

		const dialog = await openAddSkill(user);
		await pick(user, dialog, "bak", "Baking");
		await user.click(within(dialog).getByRole("button", { name: "Add skill" }));

		await waitFor(() => {
			expect(
				within(dialog).getByRole("button", { name: /^Skill/ })
			).toHaveAccessibleDescription("They already have this skill.");
		});
		expect(sent(calls, SAVE_SKILLS)).toEqual([]);
	});

	it.each([
		[problemReply(409, "SKILL_NAME_CONFLICT")],
		[
			{
				status: 409,
				body: { status: 409, title: "Conflict", detail: "API says" },
			},
		],
	])("asks to reload when someone else changed them: %j", async (reply) => {
		const user = userEvent.setup();
		await open({ ...routes(editor()), [SAVE_SKILLS]: reply });

		const dialog = await openAddSkill(user);
		await pick(user, dialog, "past", "Pastry art");
		await user.click(within(dialog).getByRole("button", { name: "Add skill" }));

		expect(
			await within(dialog).findByText(
				"Someone else changed their skills just now. Reload the page and try again."
			)
		).toHaveAttribute("role", "alert");
	});

	it("places a refusal of the new skill's row on its field", async () => {
		const user = userEvent.setup();
		await open({
			...routes(editor()),
			[SAVE_SKILLS]: {
				status: 400,
				body: {
					status: 400,
					title: "Refused",
					detail: "API says no",
					errors: [{ field: "skills[2].name", message: "API says no" }],
				},
			},
		});

		const dialog = await openAddSkill(user);
		await pick(user, dialog, "past", "Pastry art");
		await user.click(within(dialog).getByRole("button", { name: "Add skill" }));

		await waitFor(() => {
			expect(
				within(dialog).getByRole("button", { name: /^Skill/ })
			).toHaveAccessibleDescription("Check the skill’s name and try again.");
		});
	});

	it("can be added to for a person without a department, with the update key company-wide", async () => {
		const user = userEvent.setup();
		const calls = await open(
			routes(
				workspaceReply(["member_profile:read", "member_profile:update"]),
				unfiled
			)
		);

		const dialog = await openAddSkill(user);
		await pick(user, dialog, "past", "Pastry art");
		await user.click(within(dialog).getByRole("button", { name: "Add skill" }));

		await waitFor(() => {
			expect(sent(calls, SAVE_SKILLS)).toHaveLength(1);
		});
	});

	it("are read-only for a person without a department when the update key is held only at a department", async () => {
		await open(routes(editor(), unfiled));

		const skills = await findCard(/^Skills & proficiency \(2\)$/);
		expect(within(skills).queryByRole("button")).toBeNull();
		expect(within(skills).getAllByRole("img")).toHaveLength(2);
	});

	it("are left out when the API refuses them, reloading the workspace without asking again", async () => {
		const calls = await open({
			...routes(reader()),
			[SKILLS]: problemReply(403, "AUTHORIZATION_DENIED"),
		});

		await waitFor(() => {
			expect(sent(calls, "GET /api/v1/me/workspace").length).toBe(2);
		});
		expect(
			screen.queryByRole("region", { name: /^Skills & proficiency/ })
		).toBeNull();
		await new Promise((resolve) => {
			setTimeout(resolve, 300);
		});
		expect(sent(calls, SKILLS)).toHaveLength(1);
		expect(sent(calls, "GET /api/v1/me/workspace")).toHaveLength(2);
	});
});

describe("Changing a person's skills while editing the profile", () => {
	const editing = async (
		reply: Record<string, Route> = routes(editor())
	): Promise<Array<Call>> => {
		const calls = await open(reply, "/people/m-1?edit=true");
		await findCard(/^Skills & proficiency \(2\)$/);
		return calls;
	};
	const slider = (name: string): HTMLElement =>
		screen.getByRole("slider", { name: `Proficiency in ${name}` });

	it("holds slider and remove changes until the profile is saved, then sends the complete set after it", async () => {
		const user = userEvent.setup();
		const calls = await editing();

		expect(slider("Baking")).toHaveValue("8");
		fireEvent.change(slider("Baking"), { target: { value: "9" } });
		expect(slider("Baking")).toHaveAttribute("aria-valuetext", "9 out of 10");
		await user.click(
			screen.getByRole("button", { name: "Remove Food safety" })
		);
		expect(card(/^Skills & proficiency \(1\)$/)).toBeVisible();
		expect(sent(calls, SAVE_SKILLS)).toEqual([]);

		await user.click(screen.getByRole("button", { name: "Save changes" }));

		await screen.findByText("Changes to Kent Chua were saved.");
		expect(
			calls
				.filter(
					(call) => call.method !== "GET" && call.path.startsWith(COMPANY)
				)
				.map((call) => `${call.method} ${call.path}`)
		).toEqual([`PUT ${PROFILE}`, SAVE_SKILLS]);
		expect(sent(calls, SAVE_SKILLS)).toEqual([
			{ skills: [{ name: "Baking", proficiency: 9 }] },
		]);
	});

	it("adds a skill to the held set without sending it", async () => {
		const user = userEvent.setup();
		const calls = await editing();

		await user.click(screen.getByRole("button", { name: "Add skill" }));
		const dialog = await screen.findByRole("dialog", { name: "Add skill" });
		await user.click(within(dialog).getByRole("button", { name: /^Skill/ }));
		await user.type(
			await screen.findByRole("combobox", { name: "Search or type a skill" }),
			"Coffee"
		);
		await user.click(
			await screen.findByRole("option", { name: "Add “Coffee”" })
		);
		await user.click(within(dialog).getByRole("button", { name: "Add skill" }));

		expect(await findCard(/^Skills & proficiency \(3\)$/)).toBeVisible();
		expect(slider("Coffee")).toHaveValue("5");
		expect(sent(calls, SAVE_SKILLS)).toEqual([]);
	});

	it("sends nothing for skills when they are unchanged, even after a change was undone", async () => {
		const user = userEvent.setup();
		const calls = await editing();

		fireEvent.change(slider("Baking"), { target: { value: "3" } });
		fireEvent.change(slider("Baking"), { target: { value: "8" } });
		await user.click(screen.getByRole("button", { name: "Save changes" }));

		await screen.findByText("Changes to Kent Chua were saved.");
		expect(sent(calls, SAVE_SKILLS)).toEqual([]);
	});

	it("counts skill changes as unsaved, and discards them on cancel", async () => {
		const user = userEvent.setup();
		const calls = await editing();

		fireEvent.change(slider("Baking"), { target: { value: "2" } });
		await user.click(screen.getByRole("button", { name: "Cancel" }));
		const dialog = await screen.findByRole("dialog", {
			name: "Discard your changes?",
		});
		await user.click(
			within(dialog).getByRole("button", { name: "Discard changes" })
		);

		const skills = await findCard(/^Skills & proficiency \(2\)$/);
		expect(
			within(skills).getByRole("img", { name: "Baking: 8 out of 10" })
		).toBeVisible();
		expect(sent(calls, SAVE_SKILLS)).toEqual([]);
	});

	it("says the profile was saved when only the skills weren't", async () => {
		const user = userEvent.setup();
		await editing({
			...routes(editor()),
			[SAVE_SKILLS]: problemReply(409, "SKILL_NAME_CONFLICT"),
		});

		fireEvent.change(slider("Baking"), { target: { value: "9" } });
		await user.click(screen.getByRole("button", { name: "Save changes" }));

		expect(
			await screen.findByText(
				"Changes to Kent Chua were saved, but their skills weren’t. Edit their profile to try again."
			)
		).toHaveAttribute("role", "status");
	});

	it("can be changed for a person without a department, by someone granted company-wide", async () => {
		await open(
			routes(
				workspaceReply([
					"member_profile:read",
					"member_profile:update",
					"branch:read",
					"department:read",
					"job_title:read",
				]),
				unfiled
			),
			"/people/m-1?edit=true"
		);

		await findCard(/^Skills & proficiency \(2\)$/);
		expect(slider("Baking")).toHaveValue("8");
	});
});
