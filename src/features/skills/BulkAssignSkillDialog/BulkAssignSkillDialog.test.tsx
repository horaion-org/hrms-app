import { fireEvent, screen, waitFor, within } from "@testing-library/react";
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
import { bulkAssignBodyOf } from "@/features/skills/BulkAssignSkillDialog/schema";
import {
	licenceFixture,
	overviewFixture,
	skillFixture,
} from "@/features/skills/fixtures";

const COMPANY = "/api/v1/companies/c-1";
const ASSIGN = `POST ${COMPANY}/skills/skill-forklift/assignments`;
const page = (content: Array<unknown>, total = content.length): StubReply => ({
	status: 200,
	body: envelope({ content, page: { totalElements: total } }),
});
const person = (membershipId: string, displayName: string): unknown => ({
	membershipId,
	displayName,
	departmentName: "Warehouse",
});
const routes = (
	permissions: Array<string>,
	assign: StubReply = {
		status: 200,
		body: envelope({ assigned: 1, updated: 0, skipped: 1, full: 0 }),
	}
): Record<string, StubReply> => ({
	"POST /api/v1/public/sessions/refreshes": accessPassReply(),
	"GET /api/v1/me": currentUserReply(),
	"GET /api/v1/me/workspace": {
		status: 200,
		body: envelope(companyWideWorkspace(permissions)),
	},
	[`GET ${COMPANY}/skill-categories`]: { status: 200, body: envelope([]) },
	[`GET ${COMPANY}/skill-overview`]: page([
		overviewFixture(skillFixture(), { holders: 1 }),
		overviewFixture(
			skillFixture({ skillId: "s-old", name: "Typing", status: "INACTIVE" })
		),
	]),
	[`GET ${COMPANY}/member-profiles`]: page([
		person("m-1", "Jane Tan"),
		person("m-2", "Ali Musa"),
	]),
	[`GET ${COMPANY}/skills/skill-forklift/holders`]: page([
		{ membershipId: "m-1", proficiency: 8, issuedOn: null, expiresOn: null },
	]),
	[ASSIGN]: assign,
});

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

const EVERY_KEY = [
	"skill:read",
	"member_profile:read",
	"member_profile:update",
];

const openAssign = async (): Promise<HTMLElement> => {
	app = await openApp("/organisation/skills");
	renderAuthApp(app);
	await userEvent.click(
		await screen.findByRole("button", { name: "More actions for Forklift" })
	);
	await userEvent.click(
		await screen.findByRole("menuitem", { name: "Assign to people" })
	);
	return screen.findByRole("dialog", { name: "Assign Forklift" });
};

describe("BulkAssignSkillDialog", () => {
	it("is offered only for an active skill and with member_profile:update", async () => {
		stubApi(routes(["skill:read"]));
		app = await openApp("/organisation/skills");
		renderAuthApp(app);
		await userEvent.click(
			await screen.findByRole("button", { name: "More actions for Forklift" })
		);
		expect(
			screen.queryByRole("menuitem", { name: "Assign to people" })
		).toBeNull();
	});

	it("marks who already holds it and gives it to the people ticked", async () => {
		const user = userEvent.setup();
		const calls = stubApi(routes(EVERY_KEY));
		const dialog = await openAssign();

		const jane = (await within(dialog).findByText("Jane Tan")).closest("tr");
		expect(jane && within(jane).getByText("Has 8/10")).toBeVisible();
		const submit = within(dialog).getByRole("button", { name: "Assign (0)" });
		expect(submit).toBeDisabled();
		await user.click(
			within(dialog).getByRole("checkbox", { name: "Select all" })
		);
		fireEvent.change(
			within(dialog).getByRole("slider", { name: "Proficiency" }),
			{
				target: { value: "6" },
			}
		);
		await user.click(
			within(dialog).getByRole("button", { name: "Assign (2)" })
		);

		await waitFor(() => {
			expect(screen.queryByRole("dialog")).toBeNull();
		});
		expect(
			calls.find((call) => call.path.endsWith("/assignments"))?.body
		).toEqual({
			membershipIds: ["m-1", "m-2"],
			proficiency: 6,
			notes: null,
			issuedOn: null,
			expiresOn: null,
			overwrite: false,
		});
		expect(
			await screen.findByText(
				"Assigned to 1 person, skipped 1 who already had it."
			)
		).toBeVisible();
	});

	it("explains the hourly limit", async () => {
		const user = userEvent.setup();
		stubApi(routes(EVERY_KEY, problemReply(429, "RATE_LIMITED")));
		const dialog = await openAssign();

		await within(dialog).findByText("Ali Musa");
		await user.click(
			within(dialog).getByRole("checkbox", { name: "Select Ali Musa" })
		);
		await user.click(
			within(dialog).getByRole("button", { name: "Assign (1)" })
		);

		expect(
			await within(dialog).findByText(
				"You’ve assigned skills many times in the last hour. Wait a while and try again."
			)
		).toBeVisible();
	});
});

describe("bulkAssignBodyOf", () => {
	const values = {
		proficiency: 7,
		notes: " ",
		issuedOn: "2026-03-01",
		expiresOn: "2027-02-28",
		overwrite: true,
	};

	it("sends a rating only for a rated skill and dates only for one tracking expiry", () => {
		expect(bulkAssignBodyOf(values, skillFixture(), ["m-1"])).toEqual({
			membershipIds: ["m-1"],
			proficiency: 7,
			notes: null,
			issuedOn: null,
			expiresOn: null,
			overwrite: true,
		});
		expect(bulkAssignBodyOf(values, licenceFixture(), ["m-1"])).toMatchObject({
			proficiency: null,
			issuedOn: "2026-03-01",
			expiresOn: "2027-02-28",
		});
	});
});
