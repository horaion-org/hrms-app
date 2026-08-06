import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Me, Membership, PermissionKey } from "@/common/api";
import { PermissionGate } from "@/features/permissions/PermissionGate";
import { WorkspaceProvider } from "@/features/session/WorkspaceProvider";

const MEMBERSHIP: Membership = {
	membership_id: "membership-1",
	company_id: "company-1",
	company_name: "Acme",
	subdomain: "acme",
	company_status: "ACTIVE",
	status: "ACTIVE",
	owner: false,
};

const ME: Me = {
	user_id: "user-1",
	email: "member@example.com",
	display_name: "Member",
	status: "ACTIVE",
	memberships: [MEMBERSHIP],
};

function renderWithPermissions(
	held: Array<PermissionKey>,
	permission: PermissionKey | Array<PermissionKey>
): void {
	render(
		<WorkspaceProvider
			value={{
				me: ME,
				membership: MEMBERSHIP,
				companyId: MEMBERSHIP.company_id,
				permissions: new Set(held),
			}}
		>
			<PermissionGate fallback={<p>hidden</p>} permission={permission}>
				<p>visible</p>
			</PermissionGate>
		</WorkspaceProvider>
	);
}

describe("PermissionGate", () => {
	it("given_theRequiredPermission_when_rendered_then_showsTheChildren", () => {
		renderWithPermissions(["member:create"], "member:create");

		expect(screen.getByText("visible")).toBeInTheDocument();
	});

	it("given_noPermissions_when_rendered_then_showsTheFallback", () => {
		renderWithPermissions([], "member:create");

		expect(screen.getByText("hidden")).toBeInTheDocument();
	});

	it("given_severalAccepted_when_holdingAnyOne_then_showsTheChildren", () => {
		renderWithPermissions(["role:read"], ["member:create", "role:read"]);

		expect(screen.getByText("visible")).toBeInTheDocument();
	});

	it("given_aDifferentPermission_when_rendered_then_doesNotMatchByPrefix", () => {
		// member:read must not satisfy member:create; the keys are exact.
		renderWithPermissions(["member:read"], "member:create");

		expect(screen.getByText("hidden")).toBeInTheDocument();
	});
});
