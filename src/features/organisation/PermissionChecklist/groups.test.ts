import { describe, expect, it } from "vitest";
import {
	PERMISSION_GROUPS,
	toggleGroup,
	togglePermission,
} from "@/features/organisation/PermissionChecklist/groups";
import {
	definitionOf,
	PERMISSION_KEYS,
	type PermissionKey,
} from "@/features/workspace/permissionKeys";

const notes = PERMISSION_GROUPS.find(
	(group) => group.resource === "member_note"
);

describe("permission selection follows the contract's prerequisites", () => {
	it("ticks every prerequisite of every key, and nothing else", () => {
		for (const key of PERMISSION_KEYS) {
			const selected = togglePermission([], key, true);
			expect(selected).toEqual(
				PERMISSION_KEYS.filter(
					(item) =>
						item === key ||
						(definitionOf(key).prerequisites as ReadonlyArray<string>).includes(
							item
						)
				)
			);
		}
	});

	it("clears whatever needs a cleared key", () => {
		const all: Array<PermissionKey> = [...PERMISSION_KEYS];
		for (const key of PERMISSION_KEYS) {
			const left = togglePermission(all, key, false);
			expect(left).not.toContain(key);
			for (const item of left)
				expect(definitionOf(item).prerequisites).not.toContain(key);
		}
	});

	it("does not tick a key whose prerequisite can't be given", () => {
		expect(
			togglePermission([], "member_note:delete", true, ["member_note:read"])
		).toEqual([]);
		expect(
			togglePermission(["member_note:read"], "member_note:delete", true, [
				"member_note:read",
			])
		).toEqual(["member_note:read", "member_note:delete"]);
	});

	it("ticks a whole resource with its prerequisites, skipping what can't be ticked", () => {
		if (!notes) throw new Error("member_note group missing");
		expect(toggleGroup([], notes, true)).toEqual(notes.keys);
		expect(toggleGroup([], notes, true, ["member_note:read"])).toEqual([]);
		expect(toggleGroup([...notes.keys], notes, false)).toEqual([]);
	});

	it("leaves an existing write without its read alone until it is touched", () => {
		// A legacy role is never widened or stripped by an unrelated change.
		expect(
			togglePermission(["branch:update"], "department:read", true)
		).toEqual(["branch:update", "department:read"]);
	});
});
