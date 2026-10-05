import { describe, expect, it } from "vitest";
import type { Workspace } from "@/features/workspace/api";
import { holdsAnywhere, permissionsAt } from "@/features/workspace/scopes";

const workspace: Workspace = {
	companies: [
		{
			uuid: "c-1",
			name: "Acme",
			permissions: ["company:read"],
			branches: [
				{
					uuid: "b-1",
					name: "Orchard",
					permissions: ["branch:update"],
					departments: [
						{ uuid: "d-1", name: "Kitchen", permissions: ["department:read"] },
					],
				},
				{ uuid: "b-2", name: "Bugis", permissions: [], departments: [] },
			],
		},
	],
};

describe("permissionsAt", () => {
	it("answers with the company's keys when no unit is named", () => {
		expect(permissionsAt(workspace, "c-1")).toEqual(["company:read"]);
		expect(permissionsAt(workspace, "c-1", "c-1")).toEqual(["company:read"]);
	});

	it("adds the keys granted above a Branch or a Department to its own", () => {
		expect(permissionsAt(workspace, "c-1", "b-1")).toEqual([
			"company:read",
			"branch:update",
		]);
		expect(permissionsAt(workspace, "c-1", "d-1")).toEqual([
			"company:read",
			"branch:update",
			"department:read",
		]);
	});

	it("answers with only the company's keys for a unit the workspace does not list", () => {
		expect(permissionsAt(workspace, "c-1", "b-2")).toEqual(["company:read"]);
		expect(permissionsAt(workspace, "c-1", "b-9")).toEqual(["company:read"]);
	});

	it("answers with nothing for a company that is not in the workspace", () => {
		expect(permissionsAt(workspace, "c-9")).toEqual([]);
	});
});

describe("holdsAnywhere", () => {
	it("finds a key held at the company, a Branch or a Department", () => {
		expect(holdsAnywhere(workspace, "c-1", ["company:read"])).toBe(true);
		expect(holdsAnywhere(workspace, "c-1", ["branch:update"])).toBe(true);
		expect(
			holdsAnywhere(workspace, "c-1", ["audit_event:read", "department:read"])
		).toBe(true);
	});

	it("is false when no key is held at any scope, or the company is unknown", () => {
		expect(holdsAnywhere(workspace, "c-1", ["access_role:read"])).toBe(false);
		expect(holdsAnywhere(workspace, "c-9", ["company:read"])).toBe(false);
	});
});
