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
import { authTestI18n } from "@/features/auth/testingI18n";
import { endSession } from "@/features/auth/session";
import { renderAuthApp } from "@/features/auth/testing";
import {
	licenceFixture,
	overviewFixture,
	skillFixture,
} from "@/features/skills/fixtures";
import {
	initialSkillValues,
	skillBodyOf,
	skillSettingsSchema,
} from "@/features/skills/SkillSettingsDialog/schema";

const SKILLS = "/api/v1/companies/c-1/skills";
const routes = (reply: StubReply): Record<string, StubReply> => ({
	"POST /api/v1/public/sessions/refreshes": accessPassReply(),
	"GET /api/v1/me": currentUserReply(),
	"GET /api/v1/me/workspace": {
		status: 200,
		body: envelope(
			companyWideWorkspace(["skill:read", "skill:create", "skill:update"])
		),
	},
	"GET /api/v1/companies/c-1/skill-categories": {
		status: 200,
		body: envelope([]),
	},
	"GET /api/v1/companies/c-1/skill-overview": {
		status: 200,
		body: envelope({
			content: [overviewFixture(licenceFixture())],
			page: { totalElements: 1 },
		}),
	},
	[`POST ${SKILLS}`]: reply,
	[`PUT ${SKILLS}/skill-licence`]: reply,
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

const openCreate = async (): Promise<HTMLElement> => {
	app = await openApp("/organisation/skills");
	renderAuthApp(app);
	await userEvent.click(
		await screen.findByRole("button", { name: "Create skill" })
	);
	return screen.findByRole("dialog", { name: "Create skill" });
};

describe("SkillSettingsDialog", () => {
	it("asks for a validity only once the skill tracks expiry", async () => {
		stubApi(routes({ status: 201, body: envelope(skillFixture()) }));
		const dialog = await openCreate();

		expect(
			within(dialog).queryByRole("spinbutton", { name: "Valid for (months)" })
		).not.toBeInTheDocument();
		await userEvent.click(
			within(dialog).getByRole("checkbox", { name: /Track expiry/ })
		);
		expect(
			within(dialog).getByRole("spinbutton", { name: "Valid for (months)" })
		).toBeVisible();
	});

	it("checks the category before sending", async () => {
		const calls = stubApi(
			routes({ status: 201, body: envelope(skillFixture()) })
		);
		const dialog = await openCreate();

		await userEvent.type(
			within(dialog).getByRole("textbox", { name: "Name" }),
			"Forklift"
		);
		await userEvent.type(
			within(dialog).getByRole("textbox", { name: "Category" }),
			"X"
		);
		await userEvent.click(
			within(dialog).getByRole("button", { name: "Create skill" })
		);

		expect(
			await within(dialog).findByText(
				"Use 2 to 64 characters, or leave it empty."
			)
		).toBeVisible();
		expect(calls.some((call) => call.path === SKILLS)).toBe(false);
	});

	it("puts a taken name on the name field", async () => {
		stubApi(routes(problemReply(409, "SKILL_NAME_CONFLICT")));
		const dialog = await openCreate();

		await userEvent.type(
			within(dialog).getByRole("textbox", { name: "Name" }),
			"Forklift"
		);
		await userEvent.click(
			within(dialog).getByRole("button", { name: "Create skill" })
		);

		expect(
			await within(dialog).findByText(
				"A skill named “Forklift” already exists."
			)
		).toBeVisible();
	});

	it("edits a skill nobody holds, keeping its status", async () => {
		const calls = stubApi(
			routes({ status: 200, body: envelope(licenceFixture()) })
		);
		app = await openApp("/organisation/skills");
		renderAuthApp(app);
		await userEvent.click(
			await screen.findByRole("button", {
				name: "Edit Security Officer Licence",
			})
		);
		const dialog = await screen.findByRole("dialog", { name: "Edit skill" });

		// Nobody holds it, so how it is measured may still change.
		expect(
			within(dialog).getByRole("radio", { name: /Rated 1 to 10/ })
		).toBeEnabled();
		await userEvent.click(within(dialog).getByRole("button", { name: "Save" }));

		await waitFor(() => {
			expect(calls.find((call) => call.method === "PUT")?.body).toMatchObject({
				status: "ACTIVE",
				validityMonths: 12,
			});
		});
	});
});

describe("skill settings values", () => {
	const t = authTestI18n.t;

	it("start from the skill being edited, or a new rated skill", () => {
		expect(initialSkillValues(undefined)).toMatchObject({
			proficiencyScale: "ONE_TO_TEN",
			tracksExpiry: false,
			validityMonths: "",
		});
		expect(initialSkillValues(overviewFixture(licenceFixture()))).toMatchObject(
			{
				category: "Licence",
				proficiencyScale: "NONE",
				validityMonths: "12",
			}
		);
	});

	it("send empty texts as null and a validity only with expiry tracking", () => {
		expect(
			skillBodyOf({
				name: "Forklift",
				category: "",
				description: "",
				proficiencyScale: "ONE_TO_TEN",
				tracksExpiry: false,
				validityMonths: "12",
			})
		).toEqual({
			name: "Forklift",
			category: null,
			description: null,
			proficiencyScale: "ONE_TO_TEN",
			tracksExpiry: false,
			validityMonths: null,
		});
	});

	it("refuse a validity outside 1 to 120 whole months", () => {
		const schema = skillSettingsSchema(t);
		const values = { ...initialSkillValues(undefined), name: "Forklift" };
		expect(schema.safeParse({ ...values, validityMonths: "121" }).success).toBe(
			false
		);
		expect(schema.safeParse({ ...values, validityMonths: "1.5" }).success).toBe(
			false
		);
		expect(schema.safeParse({ ...values, validityMonths: "120" }).success).toBe(
			true
		);
	});
});
