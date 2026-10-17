import { render, screen, within } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it } from "vitest";
import { authTestI18n } from "@/features/auth/testingI18n";
import { PermissionSummary } from "@/features/organisation/PermissionSummary";
import type { PermissionKey } from "@/features/workspace/permissionKeys";

const show = (permissions: Array<PermissionKey>): void => {
	render(
		<I18nextProvider i18n={authTestI18n}>
			<PermissionSummary permissions={permissions} title="This role allows" />
		</I18nextProvider>
	);
};

describe("PermissionSummary", () => {
	it("names each resource with its allowed actions and leaves the rest out", () => {
		show(["branch:read", "branch:create", "department:read"]);

		expect(screen.getByText("This role allows")).toBeVisible();
		expect(screen.getAllByRole("term").map((term) => term.textContent)).toEqual(
			["Branches", "Departments"]
		);
		expect(
			screen.getAllByRole("definition").map((item) =>
				within(item)
					.getAllByTitle(/./)
					.map((badge) => badge.textContent)
			)
		).toEqual([["View", "Create"], ["View"]]);
	});

	it("says so when nothing is allowed", () => {
		show([]);

		expect(screen.getByText("No permissions yet.")).toBeVisible();
	});
});
