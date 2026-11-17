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
import { PERMISSION_KEYS } from "@/features/workspace/permissionKeys";

const COMPANY = "/api/v1/companies/c-1";
const GIVE = `${COMPANY}/default-access-recipients`;
const page = (content: Array<unknown>, total = content.length): StubReply => ({
	status: 200,
	body: envelope({ content, page: { totalElements: total } }),
});
const person = (membershipId: string, displayName: string): unknown => ({
	membershipId,
	displayName,
	departmentName: "Kitchen",
});
const routes = (
	give: StubReply = {
		status: 200,
		body: envelope({ given: 1, alreadyReceiving: 1 }),
	},
	people: StubReply = page([
		person("m-1", "Mei Tan"),
		person("m-2", "Aisha Rahman"),
	])
): Record<string, StubReply> => ({
	"POST /api/v1/public/sessions/refreshes": accessPassReply(),
	"GET /api/v1/me": currentUserReply(),
	"GET /api/v1/me/workspace": {
		status: 200,
		body: envelope(companyWideWorkspace(PERMISSION_KEYS)),
	},
	[`GET ${COMPANY}/access-roles`]: page([]),
	[`GET ${COMPANY}/default-access-rules`]: { status: 200, body: envelope([]) },
	[`GET ${COMPANY}/member-profiles`]: people,
	[`POST ${GIVE}`]: give,
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

const openGive = async (): Promise<HTMLElement> => {
	app = await openApp("/settings/access-roles");
	renderAuthApp(app);
	await userEvent.click(
		await screen.findByRole("button", {
			name: "Give default access to people already here",
		})
	);
	return screen.findByRole("dialog", { name: "Give default access" });
};

describe("GiveDefaultAccessDialog", () => {
	it("gives default access to everyone listed with the header box and reports both counts", async () => {
		const calls = stubApi(routes());
		const dialog = await openGive();
		await within(dialog).findByText("Aisha Rahman");

		await userEvent.click(
			within(dialog).getByRole("checkbox", { name: "Select all" })
		);
		expect(within(dialog).getByRole("status")).toHaveTextContent(
			"2 people selected"
		);
		await userEvent.click(
			within(dialog).getByRole("button", {
				name: "Give default access to 2 people",
			})
		);

		await waitFor(() => {
			expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
		});
		expect(
			calls.find((call) => call.method === "POST" && call.path === GIVE)?.body
		).toEqual({ companyMembershipIds: ["m-1", "m-2"] });
		expect(
			await screen.findByText(
				"Gave default access to 1 person. 1 already had it."
			)
		).toBeVisible();
	});

	it("keeps Give off until someone is ticked", async () => {
		stubApi(routes());
		const dialog = await openGive();
		await within(dialog).findByText("Mei Tan");

		expect(
			within(dialog).getByRole("button", {
				name: "Give default access to 0 people",
			})
		).toBeDisabled();
	});

	it("says only the first 500 are shown when more people match", async () => {
		stubApi(routes(undefined, page([person("m-1", "Mei Tan")], 650)));
		const dialog = await openGive();

		expect(
			await within(dialog).findByText(
				"Showing the first 500 of 650. Search or choose a department to reach the others."
			)
		).toBeVisible();
	});

	it("keeps the dialog open with a refusal that says what to do", async () => {
		stubApi(routes(problemReply(400, "INVALID_DEFAULT_ACCESS_RECIPIENT")));
		const dialog = await openGive();
		await userEvent.click(
			await within(dialog).findByRole("checkbox", { name: "Select Mei Tan" })
		);
		await userEvent.click(
			within(dialog).getByRole("button", {
				name: "Give default access to 1 person",
			})
		);

		expect(await within(dialog).findByRole("alert")).toHaveTextContent(
			"Someone you chose has left the company. Untick them and try again."
		);
	});
});
