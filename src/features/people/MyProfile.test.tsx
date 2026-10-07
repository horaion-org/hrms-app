import { screen } from "@testing-library/react";
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

const REFRESH = "POST /api/v1/public/sessions/refreshes";
const ME = "GET /api/v1/me";
const WORKSPACE = "GET /api/v1/me/workspace";
const MY_PROFILE = "GET /api/v1/companies/c-1/me/profile";

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

const open = async (entry: string): Promise<OpenedApp> => {
	app = await openApp(entry);
	renderAuthApp(app);
	return app;
};

/** A workspace granting nothing anywhere: the own profile needs nothing. */
const workspaceReply: StubReply = {
	status: 200,
	body: envelope({
		companies: [
			{ uuid: "c-1", name: "Company c-1", permissions: [], branches: [] },
		],
	}),
};

const profile = {
	membershipId: "m-c-1",
	employeeCode: "EMP-00007",
	displayName: "Kent Chua",
	email: "kent@company.com",
	phone: "+6591234821",
	branchId: "b-1",
	branchName: "Orchard",
	departmentId: "d-1",
	departmentName: "Front Office",
	jobTitleId: "j-1",
	jobTitleName: "Front office manager",
	status: "ACTIVE",
	dateOfBirth: "1990-05-01",
	employmentType: "FULL_TIME",
	hireDate: "2026-01-05",
	probationEndDate: null,
	endDate: null,
	reportsTo: null,
	invitationPending: false,
};

const routes = (own: StubReply): Record<string, StubReply> => ({
	[REFRESH]: accessPassReply(),
	[ME]: currentUserReply(),
	[WORKSPACE]: workspaceReply,
	[MY_PROFILE]: own,
});

describe("My profile", () => {
	it("opens from the avatar in the header and shows the member's own profile, with nothing granted", async () => {
		stubApi(routes({ status: 200, body: envelope(profile) }));
		const { router } = await open("/");

		const link = await screen.findByRole("link", { name: "My profile" });
		expect(link).toHaveAttribute("href", "/me/profile");
		await router.navigate({ to: "/me/profile" });

		expect(
			await screen.findByRole("heading", { level: 1, name: "Kent Chua" })
		).toBeVisible();
		expect(screen.getAllByText("EMP-00007")).not.toHaveLength(0);
		expect(screen.getAllByText("Front office manager")).not.toHaveLength(0);
		expect(screen.getByText("kent@company.com")).toBeVisible();
		expect(
			screen.queryByRole("button", { name: "Edit profile" })
		).not.toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: /More actions/ })
		).not.toBeInTheDocument();
	});

	it("explains a profile that could not be read", async () => {
		stubApi(routes(problemReply(404, "MEMBER_PROFILE_NOT_FOUND")));
		await open("/me/profile");

		expect(await screen.findByRole("alert")).toHaveTextContent(
			"We couldn’t load your profile. Try again."
		);
	});
});
