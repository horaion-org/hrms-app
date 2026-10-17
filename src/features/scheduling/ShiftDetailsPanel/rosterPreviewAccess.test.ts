import { describe, expect, it } from "vitest";
import { companyWideWorkspace } from "@/common/testing/effectiveWorkspace";
import { buildAccessIndex, canAt } from "@/features/workspace/scopes";
import type { Access } from "@/features/workspace/useAccess";
import { rosterPreviewAccess } from "@/features/scheduling/ShiftDetailsPanel/rosterPreviewAccess";

const accessFor = (
	permissions: Array<string>,
	status: Access["status"] = "ready"
): Pick<Access, "can" | "status"> => {
	const index = buildAccessIndex(companyWideWorkspace(permissions), "c-1");
	return { status, can: (key, target) => canAt(index, key, target) };
};
const NONE = { edit: false, reassign: false, duplicate: false, delete: false };
const ALL = [
	"shift:read",
	"shift:update",
	"shift:create",
	"shift:delete",
	"member_profile:read",
];

describe("roster preview workspace gates", () => {
	it("denies unknown and unselected departments even with company-wide grants", () => {
		const access = accessFor(ALL);
		expect(rosterPreviewAccess(access, undefined, true)).toEqual(NONE);
		expect(rosterPreviewAccess(access, "unknown", true)).toEqual(NONE);
	});
	it.each(["pending", "error"] as const)(
		"denies while workspace is %s",
		(status) => {
			expect(rosterPreviewAccess(accessFor(ALL, status), "d-1", true)).toEqual(
				NONE
			);
		}
	);
	it("keeps actions separate and requires member access for reassignment", () => {
		expect(
			rosterPreviewAccess(
				accessFor(["shift:read", "shift:update"]),
				"d-1",
				true
			)
		).toEqual({ ...NONE, edit: true });
		expect(
			rosterPreviewAccess(
				accessFor(["shift:read", "shift:create"]),
				"d-1",
				true
			)
		).toEqual({ ...NONE, duplicate: true });
		expect(
			rosterPreviewAccess(
				accessFor(["shift:read", "shift:delete"]),
				"d-1",
				true
			)
		).toEqual({ ...NONE, delete: true });
	});
	it("withdraws actions when grants are removed and keeps published schedules read-only", () => {
		expect(rosterPreviewAccess(accessFor(ALL), "d-1", true)).toEqual({
			edit: true,
			reassign: true,
			duplicate: true,
			delete: true,
		});
		expect(rosterPreviewAccess(accessFor(["shift:read"]), "d-1", true)).toEqual(
			NONE
		);
		expect(rosterPreviewAccess(accessFor(ALL), "d-1", false)).toEqual(NONE);
	});
});
