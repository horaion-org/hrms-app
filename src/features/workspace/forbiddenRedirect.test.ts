import { isRedirect } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";
import {
	companyWideWorkspace,
	effectiveWorkspace,
	TEST_BRANCHES,
} from "@/common/testing/effectiveWorkspace";
import { forbiddenRedirect } from "@/features/workspace/forbiddenRedirect";
import { COMPANY_SCOPE } from "@/features/workspace/scopes";

/** Company `c-1` with `member_profile:create` at the Kitchen Department only. */
const kitchenOnly = effectiveWorkspace({
	companies: [
		{
			uuid: "c-1",
			name: "Company c-1",
			permissions: [],
			branches: TEST_BRANCHES.map((branch) => ({
				...branch,
				departments: branch.departments.map((department) => ({
					...department,
					permissions:
						department.uuid === "d-1" ? ["member_profile:create"] : [],
				})),
			})),
		},
	],
});

describe("forbiddenRedirect", () => {
	it("lets the page load when the key is granted where it asks", () => {
		expect(
			forbiddenRedirect({
				workspace: companyWideWorkspace(["audit_event:read"]),
				companyId: "c-1",
				permission: "audit_event:read",
				target: COMPANY_SCOPE,
			})
		).toBeUndefined();
	});

	it("counts a grant at one Department for a page that asks anywhere", () => {
		expect(
			forbiddenRedirect({
				workspace: kitchenOnly,
				companyId: "c-1",
				permission: "member_profile:create",
				target: "anywhere",
			})
		).toBeUndefined();
	});

	it("redirects to the Forbidden page, replacing the refused entry, when the key is missing", () => {
		const result = forbiddenRedirect({
			workspace: companyWideWorkspace(["audit_event:read"]),
			companyId: "c-1",
			permission: "access_role:create",
			target: COMPANY_SCOPE,
		});

		expect(isRedirect(result)).toBe(true);
		expect(result?.options).toMatchObject({ to: "/forbidden", replace: true });
	});

	it("does not count a Department grant for a page that needs the company", () => {
		expect(
			isRedirect(
				forbiddenRedirect({
					workspace: kitchenOnly,
					companyId: "c-1",
					permission: "member_profile:create",
					target: COMPANY_SCOPE,
				})
			)
		).toBe(true);
	});

	it("leaves the page to explain itself when the workspace did not load", () => {
		expect(
			forbiddenRedirect({
				workspace: undefined,
				companyId: "c-1",
				permission: "access_role:create",
				target: COMPANY_SCOPE,
			})
		).toBeUndefined();
	});

	it("judges nothing before a company is chosen", () => {
		expect(
			forbiddenRedirect({
				workspace: companyWideWorkspace([]),
				companyId: undefined,
				permission: "access_role:create",
				target: COMPANY_SCOPE,
			})
		).toBeUndefined();
	});
});
