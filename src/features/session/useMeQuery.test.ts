import { describe, expect, it } from "vitest";
import type { Me, Membership } from "@/common/api";
import { activeMembership } from "@/features/session/useMeQuery";

function membership(overrides: Partial<Membership>): Membership {
	return {
		membership_id: "membership-1",
		company_id: "company-1",
		company_name: "Acme",
		subdomain: "acme",
		company_status: "ACTIVE",
		status: "ACTIVE",
		owner: false,
		...overrides,
	};
}

function me(memberships: Array<Membership>): Me {
	return {
		user_id: "user-1",
		email: "member@example.com",
		display_name: "Member",
		status: "ACTIVE",
		memberships,
	};
}

describe("activeMembership", () => {
	it("given_noBootstrapYet_when_selected_then_returnsUndefined", () => {
		expect(activeMembership(undefined)).toBeUndefined();
	});

	it("given_onlyInactiveMemberships_when_selected_then_returnsUndefined", () => {
		const result = activeMembership(me([membership({ status: "INACTIVE" })]));

		expect(result).toBeUndefined();
	});

	it("given_anActiveMembership_when_selected_then_returnsIt", () => {
		const result = activeMembership(me([membership({})]));

		expect(result?.company_id).toBe("company-1");
	});

	it("given_aClosedCompany_when_selected_then_skipsTheDeactivatedMembership", () => {
		// Closing a Company deactivates its Memberships, so the inactive entry
		// must not become the active workspace.
		const result = activeMembership(
			me([
				membership({
					status: "INACTIVE",
					company_status: "CLOSED",
					company_id: "closed-company",
				}),
				membership({ company_id: "open-company" }),
			])
		);

		expect(result?.company_id).toBe("open-company");
	});
});
