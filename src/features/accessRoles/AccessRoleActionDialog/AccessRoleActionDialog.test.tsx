import { composeStories } from "@storybook/react-vite";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { configureApiClient, resetApiClient } from "@/common/api-client";
import { envelope, problemReply, stubApi } from "@/common/testing/stubApi";
import * as stories from "./AccessRoleActionDialog.stories";

const { Delete, Duplicate, Deactivate } = composeStories(stories);

const ROLE = "/api/v1/companies/story-company/access-roles/r-1";

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

it("deletes the role after asking, and explains a refusal", async () => {
	const user = userEvent.setup();
	const calls = stubApi({
		[`DELETE ${ROLE}`]: problemReply(409, "ACCESS_ROLE_IN_USE"),
	});
	render(<Delete />);

	expect(
		await screen.findByRole("dialog", { name: "Delete Manager" })
	).toBeVisible();
	await user.click(screen.getByRole("button", { name: "Delete role" }));

	expect(await screen.findByRole("alert")).toBeVisible();
	expect(calls.map((call) => `${call.method} ${call.path}`)).toContain(
		`DELETE ${ROLE}`
	);
	expect(Delete.args.onClose).not.toHaveBeenCalled();
});

it("deactivates the role once it has shown who loses access, the person themselves included", async () => {
	const user = userEvent.setup();
	const calls = stubApi({
		[`GET ${ROLE}/access-role-assignments`]: {
			status: 200,
			body: envelope([
				{
					accessRoleAssignmentId: "a-1",
					// The story's signed-in member.
					companyMembershipId: "story-member",
					displayName: "Priya Nair",
					status: "ACTIVE",
					branchId: null,
					branchName: null,
					departmentId: null,
					departmentName: null,
				},
			]),
		},
		[`PUT ${ROLE}`]: { status: 200, body: envelope({}) },
	});
	render(<Deactivate />);

	expect(
		await screen.findByText(
			"You hold this role. You will lose these permissions too."
		)
	).toBeVisible();
	await user.click(
		screen.getByRole("button", {
			name: "Deactivate and remove access for 1 person",
		})
	);

	await waitFor(() => {
		expect(calls.find((call) => call.method === "PUT")?.body).toMatchObject({
			name: "Manager",
			status: "INACTIVE",
		});
	});
});

it("duplicates the role with its kind, a copy's name and only the permissions the person may grant", async () => {
	stubApi({});
	render(<Duplicate />);

	expect(
		await screen.findByRole("dialog", { name: "Create access role" })
	).toBeVisible();
	expect(screen.getByLabelText("Role name")).toHaveValue("Manager copy");
});
