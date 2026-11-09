import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetApiClient } from "@/common/api-client";
import { companyWideWorkspace } from "@/common/testing/effectiveWorkspace";
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
	licenceFixture,
	overviewFixture,
	skillFixture,
} from "@/features/skills/fixtures";

const REFRESH = "POST /api/v1/public/sessions/refreshes";
const ME = "GET /api/v1/me";
const WORKSPACE = "GET /api/v1/me/workspace";
const OVERVIEW = "GET /api/v1/companies/c-1/skill-overview";
const CATEGORIES = "GET /api/v1/companies/c-1/skill-categories";
const SKILLS = "POST /api/v1/companies/c-1/skills";
const FORKLIFT = "/api/v1/companies/c-1/skills/skill-forklift";
const EVERY_KEY = [
	"skill:read",
	"skill:create",
	"skill:update",
	"skill:delete",
	"member_profile:read",
	"member_profile:update",
];

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

const routes = (permissions = EVERY_KEY): Record<string, StubReply> => ({
	[REFRESH]: accessPassReply(),
	[ME]: currentUserReply(),
	[WORKSPACE]: {
		status: 200,
		body: envelope(companyWideWorkspace(permissions)),
	},
	[CATEGORIES]: { status: 200, body: envelope(["Equipment", "Licence"]) },
});

const pageReply = (content: Array<unknown>): StubReply => ({
	status: 200,
	body: envelope({ content, page: { totalElements: content.length } }),
});

const forklift = overviewFixture(skillFixture(), { holders: 6 });
const licence = overviewFixture(licenceFixture(), {
	holders: 30,
	expiringSoon: 3,
	expired: 1,
});

const open = async (): Promise<OpenedApp> => {
	app = await openApp("/organisation/skills");
	renderAuthApp(app);
	return app;
};

const rowOf = async (
	table: HTMLElement,
	name: string
): Promise<HTMLElement> => {
	const row = (await within(table).findByText(name)).closest("tr");
	if (!row) throw new Error(`No row for ${name}`);
	return row;
};

describe("Skills", () => {
	it("lists the catalogue with how each is measured, its holders and expiring credentials", async () => {
		const calls = stubApi({
			...routes(),
			[OVERVIEW]: pageReply([forklift, licence]),
		});
		await open();

		expect(
			await screen.findByRole("heading", { level: 1, name: "Skills" })
		).toBeVisible();
		const table = await screen.findByRole("table", { name: "Skills" });
		await within(table).findByText("Forklift");
		const licenceRow = await rowOf(table, "Security Officer Licence");
		// Each value in its own column's cell (the name's line repeats them on phones).
		const cellOf = (row: HTMLElement, name: string | RegExp): HTMLElement =>
			within(row).getByRole("cell", { name });
		expect(cellOf(licenceRow, "Held or not")).toBeVisible();
		expect(cellOf(licenceRow, "Tracked · 12 months")).toBeVisible();
		const holders = cellOf(licenceRow, /^30 people/);
		expect(within(holders).getByText("3 soon")).toBeVisible();
		expect(within(holders).getByText("1 expired")).toBeVisible();
		const forkliftRow = await rowOf(table, "Forklift");
		expect(cellOf(forkliftRow, "Rated 1–10")).toBeVisible();
		expect(cellOf(forkliftRow, "Equipment")).toBeVisible();
		// Phones keep the skill and the actions; Status joins from sm and the rest from md.
		const hiddenOnPhones = within(table)
			.getAllByRole("columnheader")
			.filter((header) => header.classList.contains("hidden"))
			.map((header) => header.textContent);
		expect(hiddenOnPhones).toEqual([
			"Category",
			"Measured by",
			"Expiry",
			"People",
			"Status",
			"Created",
		]);
		expect(cellOf(forkliftRow, "Equipment")).toHaveClass("md:table-cell");
		expect(
			within(table).getByRole("columnheader", { name: /Status/ })
		).toHaveClass("sm:table-cell");
		// Expiry counts are read on the viewer's own day.
		const overview = calls.find(
			(call) => call.path === "/api/v1/companies/c-1/skill-overview"
		);
		expect(new URLSearchParams(overview?.search).get("asOf")).toMatch(
			/^\d{4}-\d{2}-\d{2}$/
		);
	});

	it("says so instead of listing when skill:read is not held at the company", async () => {
		stubApi({ ...routes(["member_profile:read"]), [OVERVIEW]: pageReply([]) });
		await open();

		expect(
			await screen.findByText("You don’t have permission to view this list.")
		).toBeVisible();
		expect(
			screen.queryByRole("button", { name: "Create skill" })
		).not.toBeInTheDocument();
	});

	it("narrows the list to a category on the server", async () => {
		const calls = stubApi({
			...routes(),
			[OVERVIEW]: pageReply([forklift, licence]),
		});
		await open();
		await screen.findByRole("table", { name: "Skills" });

		await userEvent.click(screen.getByRole("button", { name: /Filters/ }));
		await userEvent.click(
			await screen.findByRole("button", { name: "Category" })
		);
		await userEvent.click(
			await screen.findByRole("option", { name: "Licence" })
		);

		await waitFor(() => {
			expect(
				calls.some(
					(call) =>
						call.path === "/api/v1/companies/c-1/skill-overview" &&
						new URLSearchParams(call.search).get("category") === "Licence"
				)
			).toBe(true);
		});
	});

	it("creates a skill that tracks expiry with a validity", async () => {
		const calls = stubApi({
			...routes(),
			[OVERVIEW]: pageReply([]),
			[SKILLS]: { status: 201, body: envelope(licenceFixture()) },
		});
		await open();
		await userEvent.click(
			await screen.findByRole("button", { name: "Create skill" })
		);
		const dialog = await screen.findByRole("dialog", { name: "Create skill" });

		await userEvent.type(
			within(dialog).getByRole("textbox", { name: "Name" }),
			"Security Officer Licence"
		);
		await userEvent.type(
			within(dialog).getByRole("textbox", { name: "Category" }),
			"Licence"
		);
		await userEvent.click(
			within(dialog).getByRole("radio", { name: /Held or not/ })
		);
		await userEvent.click(
			within(dialog).getByRole("checkbox", { name: /Track expiry/ })
		);
		await userEvent.type(
			within(dialog).getByRole("spinbutton", { name: "Valid for (months)" }),
			"12"
		);
		await userEvent.click(
			within(dialog).getByRole("button", { name: "Create skill" })
		);

		await waitFor(() => {
			expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
		});
		expect(
			calls.find(
				(call) =>
					call.method === "POST" && call.path === "/api/v1/companies/c-1/skills"
			)?.body
		).toEqual({
			name: "Security Officer Licence",
			category: "Licence",
			description: null,
			proficiencyScale: "NONE",
			tracksExpiry: true,
			validityMonths: 12,
		});
	});

	it("keeps the measure fixed while people hold the skill and explains a refusal", async () => {
		stubApi({
			...routes(),
			[OVERVIEW]: pageReply([forklift]),
			[`PUT ${FORKLIFT}`]: problemReply(409, "SKILL_MEASURE_IN_USE"),
		});
		await open();
		const table = await screen.findByRole("table", { name: "Skills" });
		await userEvent.click(
			within(await rowOf(table, "Forklift")).getByRole("button", {
				name: "Edit Forklift",
			})
		);
		const dialog = await screen.findByRole("dialog", { name: "Edit skill" });

		expect(
			within(dialog).getByRole("radio", { name: /Rated 1 to 10/ })
		).toBeDisabled();
		expect(
			within(dialog).getByRole("checkbox", { name: /Track expiry/ })
		).toBeDisabled();
		expect(
			within(dialog).getByText("Fixed while people hold this skill.")
		).toBeVisible();
		await userEvent.click(within(dialog).getByRole("button", { name: "Save" }));
		expect(
			await within(dialog).findByText(
				"People hold this skill, so how it is measured and whether it tracks expiry can’t change."
			)
		).toBeVisible();
	});

	it("deletes a held skill only after saying how many people lose it", async () => {
		const calls = stubApi({
			...routes(),
			[OVERVIEW]: pageReply([forklift]),
			[`DELETE ${FORKLIFT}`]: { status: 204 },
		});
		await open();
		const table = await screen.findByRole("table", { name: "Skills" });
		await userEvent.click(
			within(await rowOf(table, "Forklift")).getByRole("button", {
				name: "More actions for Forklift",
			})
		);
		await userEvent.click(
			await screen.findByRole("menuitem", { name: "Delete" })
		);
		const confirm = await screen.findByRole("dialog", {
			name: "Delete Forklift?",
		});

		expect(
			within(confirm).getByText(
				/6 people hold Forklift\. Deleting it also removes it from them/
			)
		).toBeVisible();
		expect(calls.some((call) => call.method === "DELETE")).toBe(false);
		await userEvent.click(
			within(confirm).getByRole("button", { name: "Delete skill" })
		);
		await waitFor(() => {
			expect(calls.some((call) => call.method === "DELETE")).toBe(true);
		});
	});

	it("offers neither editing nor deleting without the keys", async () => {
		stubApi({
			...routes(["skill:read"]),
			[OVERVIEW]: pageReply([forklift]),
		});
		await open();
		const table = await screen.findByRole("table", { name: "Skills" });
		const row = await rowOf(table, "Forklift");

		expect(
			within(row).getByRole("button", { name: "Edit Forklift" })
		).toBeDisabled();
		expect(
			screen.queryByRole("button", { name: "Create skill" })
		).not.toBeInTheDocument();
		await userEvent.click(
			within(row).getByRole("button", { name: "More actions for Forklift" })
		);
		expect(
			await screen.findByRole("menuitem", { name: "Delete" })
		).toHaveAttribute("aria-disabled", "true");
	});
});
