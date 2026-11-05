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

const REFRESH = "POST /api/v1/public/sessions/refreshes";
const ME = "GET /api/v1/me";
const WORKSPACE = "GET /api/v1/me/workspace";
const IMPORTS = "/api/v1/companies/c-1/member-imports";

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

const baseRoutes = (): Record<string, StubReply> => ({
	[REFRESH]: accessPassReply(),
	[ME]: currentUserReply(),
	[WORKSPACE]: {
		status: 200,
		body: envelope(
			effectiveWorkspace({
				companies: [
					{
						uuid: "c-1",
						name: "Company c-1",
						permissions: ["member_profile:read", "member_profile:create"],
						branches: [],
					},
				],
			})
		),
	},
	[`GET ${IMPORTS}`]: { status: 200, body: envelope([]) },
});

const values = (
	name: string,
	email: string,
	department: string
): Record<string, string> => ({
	NAME: name,
	EMAIL: email,
	BRANCH: "Orchard",
	DEPARTMENT: department,
	JOB_TITLE: "",
	PHONE: "",
	DATE_OF_BIRTH: "",
	EMPLOYMENT_TYPE: "",
	HIRE_DATE: "",
	PROBATION_END_DATE: "",
});

const checkReply = (errorRows: number): StubReply => ({
	status: 200,
	body: envelope({
		totalRows: 2,
		readyRows: 2 - errorRows,
		skippedRows: 0,
		errorRows,
		noticeRows: 0,
		unknownColumns: ["Salary"],
		invitationsAvailable: false,
		runningImportId: null,
		rows: [
			{
				row: 2,
				status: "READY",
				values: values("Ada Tan", "ada@acme.sg", "Patrol"),
				problems: [],
			},
			errorRows > 0
				? {
						row: 3,
						status: "ERROR",
						values: values("Tan Wei Ming", "wm@acme.sg", "Kitchen"),
						problems: [
							{
								column: "DEPARTMENT",
								code: "DEPARTMENT_NOT_FOUND",
								severity: "ERROR",
							},
						],
					}
				: {
						row: 3,
						status: "READY",
						values: values("Siti", "siti@acme.sg", "Patrol"),
						problems: [],
					},
		],
	}),
});

const finishedImport = {
	importId: "i-1",
	status: "COMPLETED",
	requestedBy: "Moses Lee",
	sendInvitations: false,
	totalRows: 2,
	processedRows: 2,
	addedRows: 1,
	invitePendingRows: 0,
	skippedRows: 0,
	failedRows: 1,
	createdAt: "2026-11-04T08:00:00Z",
	finishedAt: "2026-11-04T08:01:00Z",
	rows: [
		{ rowNumber: 2, result: "ADDED", code: null, membershipId: "m-9" },
		{
			rowNumber: 3,
			result: "FAILED_ACCOUNT",
			code: "EMAIL_ALREADY_REGISTERED",
			membershipId: null,
		},
	],
};

const upload = async (
	user: ReturnType<typeof userEvent.setup>,
	name: string
): Promise<void> => {
	await user.click(
		await screen.findByRole("button", { name: "I have a file" })
	);
	await user.upload(
		screen.getByLabelText(/choose a file/),
		new File(["Name,Email"], name, { type: "text/csv" })
	);
};

describe("PeopleImport", () => {
	it("checks a file without saving, groups its problems and blocks the import until it is fixed", async () => {
		const user = userEvent.setup({ applyAccept: false });
		const calls = stubApi({
			...baseRoutes(),
			[`POST ${IMPORTS}/checks`]: checkReply(1),
		});
		await open("/settings/data/import-people");

		await upload(user, "people.csv");

		expect(
			await screen.findByText("Nothing has been saved yet.")
		).toBeVisible();
		expect(
			screen.getByText("1 row needs fixing before you can import.")
		).toBeVisible();
		expect(screen.getByText("Ignored columns: Salary")).toBeVisible();
		const group = screen.getByRole("button", {
			name: "This branch has no department of this name. · 1 row",
		});
		await user.click(group);
		const table = screen.getByRole("table", { name: "Checked rows" });
		expect(within(table).getAllByRole("row")).toHaveLength(2);
		expect(within(table).getByText("Kitchen")).toHaveAttribute(
			"data-flagged",
			"true"
		);
		expect(
			screen.getByRole("button", { name: "Import 1 person" })
		).toBeDisabled();
		expect(
			screen.getByRole("checkbox", { name: "Send invitations now" })
		).toBeDisabled();
		expect(
			calls.filter((call) => call.path === IMPORTS && call.method === "POST")
		).toHaveLength(0);

		await user.click(
			screen.getByRole("button", { name: "Download rows with errors" })
		);
		expect(createObjectUrl).toHaveBeenCalled();
	});

	it("imports a clean file after confirming and follows it to its result", async () => {
		const user = userEvent.setup({ applyAccept: false });
		const calls = stubApi({
			...baseRoutes(),
			[`POST ${IMPORTS}/checks`]: checkReply(0),
			[`POST ${IMPORTS}`]: {
				status: 202,
				body: envelope({ ...finishedImport, status: "QUEUED", rows: [] }),
			},
			[`GET ${IMPORTS}/i-1`]: { status: 200, body: envelope(finishedImport) },
		});
		const opened = await open("/settings/data/import-people");

		await upload(user, "people.csv");
		await user.click(
			await screen.findByRole("button", { name: "Import 2 people" })
		);
		const dialog = await screen.findByRole("dialog");
		expect(dialog).toHaveTextContent(
			"Nobody is emailed now; invite people from their profile."
		);
		await user.click(
			within(dialog).getByRole("button", { name: "Import people" })
		);

		expect(await screen.findByText("Import finished")).toBeVisible();
		expect(
			screen.getByText(
				"1 added · 0 added, invite pending · 0 skipped · 1 failed"
			)
		).toBeVisible();
		expect(
			screen.getByText("This email already has a Horaion account.")
		).toBeVisible();
		expect(screen.getByRole("link", { name: "Open profile" })).toHaveAttribute(
			"href",
			"/people/m-9"
		);
		expect(opened.router.state.location.search).toEqual({ import: "i-1" });
		expect(
			calls.find((call) => call.method === "POST" && call.path === IMPORTS)
				?.search
		).toBe("sendInvitations=false");
	});

	it("refuses another file type before uploading it", async () => {
		const user = userEvent.setup({ applyAccept: false });
		const calls = stubApi(baseRoutes());
		await open("/settings/data/import-people");

		await upload(user, "people.xls");

		expect(await screen.findByRole("alert")).toHaveTextContent(
			"We can't read this file. Save it as an Excel workbook (.xlsx) or as CSV UTF-8, then try again."
		);
		expect(calls.some((call) => call.path === `${IMPORTS}/checks`)).toBe(false);
	});

	it("explains a file the API refuses as a whole", async () => {
		const user = userEvent.setup({ applyAccept: false });
		stubApi({
			...baseRoutes(),
			[`POST ${IMPORTS}/checks`]: problemReply(400, "MISSING_COLUMNS"),
		});
		await open("/settings/data/import-people");

		await upload(user, "people.csv");

		expect(await screen.findByRole("alert")).toHaveTextContent(
			"Your file is missing the Name or Email column."
		);
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
						'attachment; filename="people-import-template.xlsx"',
				},
			},
		});
		await open("/settings/data/import-people");

		await user.click(
			await screen.findByRole("button", { name: "Download template (.xlsx)" })
		);

		await waitFor(() => {
			expect(createObjectUrl).toHaveBeenCalled();
		});
	});

	it("lists earlier imports in Import history and opens one from it", async () => {
		const user = userEvent.setup();
		stubApi({
			...baseRoutes(),
			[`GET ${IMPORTS}`]: { status: 200, body: envelope([finishedImport]) },
			[`GET ${IMPORTS}/i-1`]: { status: 200, body: envelope(finishedImport) },
		});
		const opened = await open("/settings/data/import-people");

		const history = await screen.findByRole("table", {
			name: "Import history",
		});
		expect(
			screen.getByRole("heading", { level: 2, name: "Import history" })
		).toBeVisible();
		const row = within(history).getByRole("row", { name: /Moses Lee/ });
		expect(row).toHaveTextContent("1 added · 1 failed");
		await user.click(within(row).getByRole("button", { name: "View" }));

		expect(await screen.findByText("Import finished")).toBeVisible();
		expect(opened.router.state.location.search).toEqual({ import: "i-1" });
	});

	it("redirects the old /people/import address to Settings, keeping the import followed", async () => {
		stubApi({
			...baseRoutes(),
			[`GET ${IMPORTS}/i-1`]: { status: 200, body: envelope(finishedImport) },
		});
		const opened = await open("/people/import?import=i-1");

		expect(await screen.findByText("Import finished")).toBeVisible();
		expect(opened.router.state.location.pathname).toBe(
			"/settings/data/import-people"
		);
		expect(opened.router.state.location.search).toEqual({ import: "i-1" });
	});
});
