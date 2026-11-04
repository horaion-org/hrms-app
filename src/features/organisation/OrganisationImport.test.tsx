import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetApiClient } from "@/common/api-client";
import { effectiveWorkspace } from "@/common/testing/effectiveWorkspace";
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
	checkedRowFixture,
	checkFixture,
	organisationImportFixture,
} from "@/features/organisation/import/fixtures";

const REFRESH = "POST /api/v1/public/sessions/refreshes";
const ME = "GET /api/v1/me";
const WORKSPACE = "GET /api/v1/me/workspace";
const IMPORTS = "/api/v1/companies/c-1/organisation-imports";
const PAGE = "/settings/data/import-organisation";

let app: OpenedApp | undefined;
const createObjectUrl = vi.fn(() => "blob:file");
beforeEach(() => {
	vi.spyOn(window, "scrollTo").mockImplementation(() => {});
	// jsdom has no object URLs; a subclass stands in without changing the real URL.
	class DownloadUrl extends URL {
		public static override createObjectURL = createObjectUrl;
		public static override revokeObjectURL = vi.fn();
	}
	vi.stubGlobal("URL", DownloadUrl);
});
afterEach(() => {
	app?.disconnect();
	app?.queryClient.clear();
	app = undefined;
	endSession("expired");
	resetApiClient();
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
	createObjectUrl.mockClear();
	localStorage.clear();
});

const open = async (entry: string): Promise<OpenedApp> => {
	app = await openApp(entry);
	renderAuthApp(app);
	return app;
};

const workspaceReply = (
	companyPermissions: Array<string>,
	branchPermissions: Array<string> = []
): StubReply => ({
	status: 200,
	body: envelope(
		effectiveWorkspace({
			companies: [
				{
					uuid: "c-1",
					name: "Company c-1",
					permissions: companyPermissions,
					branches: [
						{
							uuid: "b-1",
							name: "Orchard",
							status: "ACTIVE",
							country: "SG",
							permissions: branchPermissions,
							departments: [],
						},
					],
				},
			],
		})
	),
});

const baseRoutes = (
	permissions: Array<string> = ["branch:create", "member_profile:create"]
): Record<string, StubReply> => ({
	[REFRESH]: accessPassReply(),
	[ME]: currentUserReply(),
	[WORKSPACE]: workspaceReply(permissions),
});

const checkWithErrors = checkFixture({
	readyRows: 2,
	errorRows: 2,
	unknownColumns: ["Branches › Notes"],
	alreadyExist: { branches: 1, departments: 0, jobTitles: 0 },
	rows: [
		...checkFixture().rows,
		checkedRowFixture({
			sheet: "DEPARTMENTS",
			row: 7,
			status: "ERROR",
			values: { BRANCH: "JUR", NAME: "Control", HEADS: "lim@acme.sg" },
			problems: [
				{ column: "HEADS", code: "HEAD_NOT_MEMBER", severity: "ERROR" },
			],
		}),
		checkedRowFixture({
			sheet: "JOB_TITLES",
			row: 12,
			status: "ERROR",
			values: {
				BRANCH: "TMP",
				DEPARTMENT: "Control",
				NAME: "Senior Officer",
				DESCRIPTION: "",
			},
			problems: [
				{ column: "BRANCH", code: "BRANCH_NOT_FOUND", severity: "ERROR" },
			],
		}),
	],
});

const upload = async (
	user: ReturnType<typeof userEvent.setup>,
	name: string
): Promise<void> => {
	await user.click(
		await screen.findByRole("button", { name: "I have a file" })
	);
	await user.upload(
		screen.getByLabelText(/choose a file/),
		new File(["xlsx"], name, {
			type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
		})
	);
};

describe("OrganisationImport", () => {
	it("checks a file without saving, shows each sheet's rows and blocks creating anything while a row has an error", async () => {
		const user = userEvent.setup({ applyAccept: false });
		const calls = stubApi({
			...baseRoutes(),
			[`POST ${IMPORTS}/checks`]: {
				status: 200,
				body: envelope(checkWithErrors),
			},
		});
		await open(PAGE);

		await upload(user, "structure.xlsx");

		expect(
			await screen.findByText("Nothing has been saved yet.")
		).toBeVisible();
		const summary = screen.getByText(
			"2 rows need fixing before anything is created."
		).parentElement?.parentElement;
		expect(summary).toHaveFocus();
		expect(summary).toHaveTextContent(
			"Will create: 1 branch · 1 department · 1 job title"
		);
		expect(summary).toHaveTextContent("Already exist (skipped): 1 branch");
		expect(summary).toHaveTextContent(
			"You will be head of 1 branch · 1 department (Heads left blank)."
		);
		expect(screen.getByText("Ignored columns: Branches › Notes")).toBeVisible();
		// The first sheet with an error opens; each tab says how many rows it has.
		expect(
			screen.getByRole("tab", { name: "Branches", selected: false })
		).toHaveAccessibleDescription("1 row");
		expect(
			screen.getByRole("tab", {
				name: "Departments · 1 to fix",
				selected: true,
			})
		).toHaveAccessibleDescription("2 rows");
		expect(
			screen.getByRole("tab", {
				name: "Job titles · 1 to fix",
				selected: false,
			})
		).toBeVisible();
		const departments = screen.getByRole("table", {
			name: "Checked rows: Departments",
		});
		expect(within(departments).getByText("lim@acme.sg")).toHaveAttribute(
			"data-flagged",
			"true"
		);
		expect(
			within(departments).getByText(
				"No one in this company has this email. Leave Heads blank to be head yourself for now."
			)
		).toBeVisible();
		expect(
			screen.getByRole("button", { name: "Create structure" })
		).toBeDisabled();

		await user.click(
			screen.getByRole("tab", { name: "Job titles · 1 to fix" })
		);
		expect(
			screen.getByText(
				"No branch has this code or name, in Horaion or on the Branches sheet."
			)
		).toBeVisible();
		await user.click(
			screen.getByRole("button", { name: "Download rows with errors" })
		);
		expect(createObjectUrl).toHaveBeenCalled();
		expect(
			calls.filter((call) => call.path === IMPORTS && call.method === "POST")
		).toHaveLength(0);
	});

	it("creates the structure after confirming and shows the result with the next step", async () => {
		const user = userEvent.setup({ applyAccept: false });
		const calls = stubApi({
			...baseRoutes(),
			[`POST ${IMPORTS}/checks`]: {
				status: 200,
				body: envelope(checkFixture()),
			},
			[`POST ${IMPORTS}`]: {
				status: 201,
				body: envelope(organisationImportFixture()),
			},
		});
		const opened = await open(PAGE);

		await upload(user, "structure.xlsx");
		expect(await screen.findByText("Your file is ready.")).toBeVisible();
		await user.click(screen.getByRole("button", { name: "Create structure" }));
		const dialog = await screen.findByRole("dialog");
		expect(dialog).toHaveTextContent(
			"Create 1 branch · 1 department · 1 job title?"
		);
		expect(dialog).toHaveTextContent("Nothing existing is changed.");
		await user.click(
			within(dialog).getByRole("button", { name: "Create structure" })
		);

		expect(await screen.findByText("Structure created")).toBeVisible();
		expect(
			screen.getByText(
				"1 branch · 1 department · 1 job title created · 0 skipped"
			)
		).toBeVisible();
		expect(
			screen.getByRole("link", { name: "Import people →" })
		).toHaveAttribute("href", "/settings/data/import-people");
		expect(screen.getByRole("link", { name: "View branches" })).toHaveAttribute(
			"href",
			"/organisation/branches"
		);
		expect(
			within(screen.getByRole("table", { name: "Row results" })).getAllByText(
				"Created"
			)
		).toHaveLength(3);
		expect(opened.router.state.location.search).toEqual({ import: "o-1" });
		// The import answers with its result, so it is not read again.
		expect(calls.filter((call) => call.path === `${IMPORTS}/o-1`)).toHaveLength(
			0
		);
	});

	it("refuses a CSV before uploading it", async () => {
		const user = userEvent.setup({ applyAccept: false });
		const calls = stubApi(baseRoutes());
		await open(PAGE);

		await upload(user, "structure.csv");

		expect(await screen.findByRole("alert")).toHaveTextContent(
			"We can't read this file. Save it as an Excel workbook (.xlsx), then try again."
		);
		expect(calls.some((call) => call.path === `${IMPORTS}/checks`)).toBe(false);
	});

	it("links to the people import that blocks it, from the check and from a refused import", async () => {
		const user = userEvent.setup({ applyAccept: false });
		stubApi({
			...baseRoutes(),
			[`POST ${IMPORTS}/checks`]: [
				{
					status: 200,
					body: envelope(checkFixture({ runningImportId: "p-7" })),
				},
				{ status: 200, body: envelope(checkFixture()) },
			],
			[`POST ${IMPORTS}`]: problemReply(409, "IMPORT_RUNNING"),
		});
		await open(PAGE);

		await upload(user, "structure.xlsx");
		expect(
			await screen.findByRole("link", { name: "View the people import" })
		).toHaveAttribute("href", "/settings/data/import-people?import=p-7");
		expect(
			screen.getByRole("button", { name: "Create structure" })
		).toBeDisabled();

		await user.click(
			screen.getByRole("button", { name: "Upload a fixed file" })
		);
		await user.upload(
			screen.getByLabelText(/choose a file/),
			new File(["xlsx"], "structure.xlsx")
		);
		await user.click(
			await screen.findByRole("button", { name: "Create structure" })
		);
		await user.click(
			within(await screen.findByRole("dialog")).getByRole("button", {
				name: "Create structure",
			})
		);

		expect(
			await screen.findByRole("link", { name: "View the people import" })
		).toHaveAttribute("href", "/settings/data/import-people");
	});

	it("reopens a finished import from its address", async () => {
		stubApi({
			...baseRoutes(),
			[`GET ${IMPORTS}/o-1`]: {
				status: 200,
				body: envelope(organisationImportFixture()),
			},
		});
		await open(`${PAGE}?import=o-1`);

		expect(await screen.findByText("Structure created")).toBeVisible();
		expect(
			screen.getByRole("listitem", { current: "step" })
		).toHaveAccessibleName("Step 4: Import");
	});

	it("downloads the template", async () => {
		const user = userEvent.setup();
		stubApi({
			...baseRoutes(),
			[`GET ${IMPORTS}/template`]: {
				status: 200,
				body: "xlsx",
				headers: {
					"Content-Disposition":
						'attachment; filename="organisation-import-template.xlsx"',
				},
			},
		});
		await open(PAGE);

		await user.click(
			await screen.findByRole("button", { name: "Download template (.xlsx)" })
		);

		await waitFor(() => {
			expect(createObjectUrl).toHaveBeenCalled();
		});
	});

	it("sends someone without branch:create company-wide to Forbidden", async () => {
		stubApi(baseRoutes(["member_profile:create"]));
		const opened = await open(PAGE);

		await waitFor(() => {
			expect(opened.router.state.location.pathname).toBe("/forbidden");
		});
	});
});
