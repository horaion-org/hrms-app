import { composeStories } from "@storybook/react-vite";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { configureApiClient, resetApiClient } from "@/common/api-client";
import { envelope, problemReply, stubApi } from "@/common/testing/stubApi";
import * as stories from "./AssignAccessRole.stories";

const { OneRole } = composeStories(stories);

const COMPANY = "/api/v1/companies/story-company";

beforeEach(() => {
	configureApiClient({
		accessToken: () => Promise.resolve("test-pass"),
		renew: () => Promise.resolve({ kind: "expired" }),
		onUnauthenticated: () => {},
	});
});
afterEach(() => {
	resetApiClient();
	vi.unstubAllGlobals();
});

it("assigns the role to a colleague at the places the person may assign at, and explains a refusal", async () => {
	const user = userEvent.setup();
	const calls = stubApi({
		[`GET ${COMPANY}/me/colleagues`]: {
			status: 200,
			body: envelope({
				content: [
					{ membershipId: "m-2", displayName: "Priya Nair", status: "ACTIVE" },
				],
				page: { totalElements: 1 },
			}),
		},
		[`GET ${COMPANY}/access-role-assignments`]: {
			status: 200,
			body: envelope([]),
		},
		[`POST ${COMPANY}/branches/b-1/access-role-assignments`]: problemReply(
			403,
			"FORBIDDEN"
		),
	});
	render(<OneRole />);

	await user.click(await screen.findByLabelText("Person"));
	await user.click(await screen.findByRole("option", { name: "Priya Nair" }));
	await user.click(screen.getByLabelText("Applies to"));
	expect(
		await screen.findByRole("option", { name: "Whole company" })
	).toBeVisible();
	await user.click(screen.getByRole("option", { name: "Orchard" }));
	await user.keyboard("{Escape}");
	await user.click(screen.getByRole("button", { name: "Assign role" }));

	expect(await screen.findByRole("alert")).toBeVisible();
	expect(calls.find((call) => call.method === "POST")?.body).toEqual({
		companyMembershipId: "m-2",
		accessRoleId: "r-1",
	});
});
