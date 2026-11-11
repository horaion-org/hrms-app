import { render, screen, within } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it } from "vitest";
import { authTestI18n } from "@/features/auth/testingI18n";
import { PermissionSummary } from "@/features/accessRoles/PermissionSummary";
import type { PermissionKey } from "@/features/workspace/permissionKeys";

const show = (permissions: Array<PermissionKey>): void => {
	render(
		<I18nextProvider i18n={authTestI18n}>
			<PermissionSummary permissions={permissions} title="This role allows" />
		</I18nextProvider>
	);
};

describe("PermissionSummary", () => {
	it("names each section with how much of it is allowed and which resources, leaving the rest out", () => {
		show([
			"branch:read",
			"branch:create",
			"department:read",
			"leave_request:read",
		]);

		expect(screen.getByText("This role allows")).toBeVisible();
		expect(screen.getAllByRole("term").map((term) => term.textContent)).toEqual(
			["Leave", "Organisation"]
		);
		expect(
			screen.getAllByRole("definition").map((item) => item.textContent)
		).toEqual(["ViewLeave", "ManageBranches and Departments"]);
		expect(
			within(screen.getAllByRole("definition")[1] as HTMLElement).getByText(
				"Manage"
			)
		).toBeVisible();
	});

	it("says so when nothing is allowed", () => {
		show([]);

		expect(screen.getByText("No permissions yet.")).toBeVisible();
	});
});
