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
	stubApi,
	type StubReply,
} from "@/common/testing/stubApi";
import { endSession } from "@/features/auth/session";
import { renderAuthApp } from "@/features/auth/testing";
import { organisationImportFixture } from "@/features/organisation/import/fixtures";

const REFRESH = "POST /api/v1/public/sessions/refreshes";
const ME = "GET /api/v1/me";
const WORKSPACE = "GET /api/v1/me/workspace";
const COMPANY = "/api/v1/companies/c-1";
const ORGANISATION_IMPORTS = `${COMPANY}/organisation-imports`;
const PEOPLE_IMPORTS = `${COMPANY}/member-imports`;

let app: OpenedApp | undefined;
const createObjectUrl = vi.fn(() => "blob:file");
beforeEach(() => {
	vi.spyOn(window, "scrollTo").mockImplementation(() => {});
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

/** Company-wide keys, and keys held only at the Orchard branch. */
const routes = (
	companyPermissions: Array<string>,
	branchPermissions: Array<string> = []
): Record<string, StubReply> => ({
	[REFRESH]: accessPassReply(),
	[ME]: currentUserReply(),
	[WORKSPACE]: {
		status: 200,
		body: envelope(
			effectiveWorkspace({
				companies: [
					{
						uuid: "c-1",
						name: "Horaion",
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
	},
});

const peopleImport = {
	importId: "p-1",
	status: "COMPLETED",
	requestedBy: "Ada Tan",
	sendInvitations: false,
	totalRows: 48,
	processedRows: 48,
	addedRows: 45,
	invitePendingRows: 0,
	skippedRows: 0,
	failedRows: 3,
	createdAt: "2026-11-04T03:05:00Z",
	finishedAt: "2026-11-04T03:07:00Z",
	rows: [],
};

describe("Settings › Data", () => {
	it("opens from ?section=data with every item and both kinds of import, newest first", async () => {
		const user = userEvent.setup();
		stubApi({
			...routes([
				"branch:create",
				"member_profile:create",
				"member_profile:read",
			]),
			[`GET ${ORGANISATION_IMPORTS}`]: {
				status: 200,
				body: envelope([
					organisationImportFixture({
						createdRows: 58,
						skippedRows: 3,
						rows: [],
					}),
				]),
			},
			[`GET ${PEOPLE_IMPORTS}`]: {
				status: 200,
				body: envelope([peopleImport]),
			},
			[`GET ${ORGANISATION_IMPORTS}/o-1`]: {
				status: 200,
				body: envelope(organisationImportFixture()),
			},
		});
		const opened = await open("/settings?section=data");

		expect(
			await screen.findByRole("tab", { name: "Data", selected: true })
		).toBeVisible();
		const panel = screen.getByRole("tabpanel", { name: "Data" });
		expect(
			within(panel).getByRole("link", { name: "Import organisation" })
		).toHaveAttribute("href", "/settings/data/import-organisation");
		expect(
			within(panel).getByRole("link", { name: "Import people" })
		).toHaveAttribute("href", "/settings/data/import-people");
		expect(
			within(panel).getByRole("button", { name: "Export people" })
		).toBeVisible();
		const history = await within(panel).findByRole("table", {
			name: "Import history",
		});
		await within(history).findByText("Organisation");
		const rows = within(history).getAllByRole("row").slice(1);
		expect(rows.map((row) => row.textContent)).toEqual([
			expect.stringContaining("PeopleAda Tan45 added · 3 failed"),
			expect.stringContaining("OrganisationMoses Lee58 created · 3 skipped"),
		]);

		await user.click(
			within(rows[1] as HTMLElement).getByRole("button", { name: "View" })
		);

		expect(await screen.findByText("Structure created")).toBeVisible();
		expect(opened.router.state.location.pathname).toBe(
			"/settings/data/import-organisation"
		);
		expect(opened.router.state.location.search).toEqual({ import: "o-1" });
	});

	it("offers someone who can only read people the export alone, and lists no imports", async () => {
		const user = userEvent.setup();
		const calls = stubApi({
			...routes([], ["member_profile:read"]),
			[`GET ${COMPANY}/member-profiles/export`]: {
				status: 200,
				body: "xlsx",
				headers: {
					"Content-Disposition": 'attachment; filename="people.xlsx"',
				},
			},
		});
		await open("/settings?section=data");

		const panel = await screen.findByRole("tabpanel", { name: "Data" });
		expect(within(panel).queryByRole("link")).not.toBeInTheDocument();
		expect(
			within(panel).queryByRole("table", { name: "Import history" })
		).not.toBeInTheDocument();

		await user.click(
			within(panel).getByRole("button", { name: "Export people" })
		);

		await waitFor(() => {
			expect(createObjectUrl).toHaveBeenCalled();
		});
		expect(
			calls.find((call) => call.path === `${COMPANY}/member-profiles/export`)
				?.search
		).toBe("");
		expect(
			calls.some(
				(call) =>
					call.path === ORGANISATION_IMPORTS || call.path === PEOPLE_IMPORTS
			)
		).toBe(false);
	});

	it("offers the organisation import only with branch:create company-wide", async () => {
		stubApi({
			...routes([], ["branch:create", "member_profile:create"]),
			[`GET ${PEOPLE_IMPORTS}`]: { status: 200, body: envelope([]) },
		});
		await open("/settings?section=data");

		const panel = await screen.findByRole("tabpanel", { name: "Data" });
		expect(
			within(panel).getByRole("link", { name: "Import people" })
		).toBeVisible();
		expect(
			within(panel).queryByRole("link", { name: "Import organisation" })
		).not.toBeInTheDocument();
		expect(await within(panel).findByText("No imports yet.")).toBeVisible();
	});

	it("has no Data tab without any of its keys, and falls back to General", async () => {
		stubApi(routes(["branch:read"]));
		await open("/settings?section=data");

		expect(
			await screen.findByRole("tab", { name: "General", selected: true })
		).toBeVisible();
		expect(screen.queryByRole("tab", { name: "Data" })).not.toBeInTheDocument();
	});

	it("puts the chosen section in the address", async () => {
		const user = userEvent.setup();
		stubApi({
			...routes(["branch:create"]),
			[`GET ${ORGANISATION_IMPORTS}`]: { status: 200, body: envelope([]) },
		});
		const opened = await open("/settings");

		await user.click(await screen.findByRole("tab", { name: "Data" }));

		await waitFor(() => {
			expect(opened.router.state.location.search).toEqual({ section: "data" });
		});
		await user.click(screen.getByRole("tab", { name: "General" }));
		await waitFor(() => {
			expect(opened.router.state.location.search).toEqual({});
		});
	});
});
