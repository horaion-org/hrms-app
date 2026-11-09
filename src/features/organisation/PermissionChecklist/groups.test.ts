import { describe, expect, it } from "vitest";
import {
	dependenciesOf,
	groupsFor,
	keysFor,
	missingUses,
	PERMISSION_GROUPS,
	scopeHintOf,
	sectionsFor,
	selectionForKind,
	tickUses,
	toggleGroup,
	togglePermission,
} from "@/features/organisation/PermissionChecklist/groups";
import {
	definitionOf,
	isCompanyOnly,
	moduleOf,
	PERMISSION_KEYS,
	PERMISSION_MODULES,
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

// Resources whose every key is company-only: a local role shows no row for them.
const COMPANY_ONLY_RESOURCES: ReadonlyArray<string> = [
	"company",
	"skill",
	"employment_terms",
	"leave_type",
	"scheduling_policy",
	"approval_flow",
	"audit_event",
];

describe("what a role's kind lets it hold", () => {
	it("gives a local role every key but the company-only ones, and every key otherwise", () => {
		expect(keysFor("LOCAL")).toEqual(
			PERMISSION_KEYS.filter((key) => !isCompanyOnly(key))
		);
		expect(keysFor("COMPANY")).toEqual(PERMISSION_KEYS);
		expect(keysFor()).toEqual(PERMISSION_KEYS);
	});

	it("drops a local role's rows that would be left empty", () => {
		expect(groupsFor("LOCAL").map((group) => group.resource)).toEqual(
			PERMISSION_GROUPS.map((group) => group.resource).filter(
				(resource) => !COMPANY_ONLY_RESOURCES.includes(resource)
			)
		);
		expect(groupsFor("LOCAL").flatMap((group) => group.keys)).toEqual(
			keysFor("LOCAL")
		);
		expect(groupsFor("COMPANY")).toBe(PERMISSION_GROUPS);
	});

	it("hints where a key applies only where the kind leaves a doubt", () => {
		expect(scopeHintOf("branch:read", "LOCAL")).toBe("notAtDepartments");
		expect(scopeHintOf("department:read", "LOCAL")).toBeUndefined();
		expect(scopeHintOf("branch:create", "COMPANY")).toBeUndefined();
		expect(scopeHintOf("branch:read", "COMPANY")).toBeUndefined();
		expect(scopeHintOf("branch:create")).toBe("companyOnly");
		expect(scopeHintOf("branch:read")).toBeUndefined();
	});

	it("clears company-only keys when a role becomes local, and names them", () => {
		const selected: Array<PermissionKey> = [
			"company:read",
			"company:update",
			"branch:read",
			"branch:create",
			"department:read",
		];
		expect(selectionForKind(selected, "LOCAL")).toEqual({
			selected: ["branch:read", "department:read"],
			removed: ["company:read", "company:update", "branch:create"],
		});
		expect(selectionForKind(selected, "COMPANY")).toEqual({
			selected,
			removed: [],
		});
		expect(selectionForKind(["branch:read"], "LOCAL")).toEqual({
			selected: ["branch:read"],
			removed: [],
		});
	});
});

describe("the role editor's sections", () => {
	it("holds every row exactly once, each in its module's section, in the contract's order", () => {
		const sections = sectionsFor();
		expect(sections.map((section) => section.module)).toEqual(
			PERMISSION_MODULES
		);
		const rows = sections.flatMap((section) => section.groups);
		expect(rows.map((group) => group.resource).sort()).toEqual(
			PERMISSION_GROUPS.map((group) => group.resource).sort()
		);
		for (const section of sections)
			for (const group of section.groups)
				for (const key of group.keys)
					expect(moduleOf(key)).toBe(section.module);
	});

	it("leaves a local role's sections that would be empty out", () => {
		const local = sectionsFor("LOCAL");
		expect(local.map((section) => section.module)).not.toContain(
			"company_settings"
		);
		// The same rows as the local role's list, only regrouped.
		expect(
			local
				.flatMap((section) => section.groups)
				.map((group) => group.resource)
				.sort()
		).toEqual(
			groupsFor("LOCAL")
				.map((group) => group.resource)
				.sort()
		);
	});
});

describe("what a permission's screens use", () => {
	it("ticks what an added key uses, with its prerequisites, and names why", () => {
		const result = tickUses([], ["member_note:read"]);
		expect(result.selected).toEqual([
			"member_profile:read",
			"member_note:read",
		]);
		expect(result.alsoTicked).toEqual([
			{
				key: "member_profile:read",
				reason: "notesOnProfile",
				by: "member_note:read",
			},
		]);
	});

	it("ticks nothing for keys that were already selected or can't be given", () => {
		expect(
			tickUses(
				["schedule:read", "schedule:create"],
				["schedule:read", "schedule:create"]
			).alsoTicked
		).toEqual([]);
		expect(
			tickUses([], ["schedule:read", "schedule:create"], ["shift:read"])
		).toEqual({
			selected: ["schedule:read", "schedule:create"],
			alsoTicked: [],
		});
	});

	it("never clears what uses a cleared key", () => {
		const before: Array<PermissionKey> = [
			"schedule:read",
			"schedule:create",
			"shift:read",
		];
		expect(
			tickUses(before, ["schedule:read", "schedule:create"]).selected
		).toEqual(["schedule:read", "schedule:create"]);
	});

	it("names what selected keys use but miss, once per key and reason", () => {
		expect(
			missingUses(
				["schedule:read", "schedule:create", "schedule:update"],
				["schedule:read", "schedule:create", "schedule:update"]
			)
		).toEqual([{ key: "shift:read", reason: "scheduleShifts" }]);
		expect(
			missingUses(["schedule:create"], ["schedule:create", "shift:read"])
		).toEqual([]);
		expect(missingUses(["schedule:create"], [])).toEqual([]);
	});
});

describe("a row's dependencies, for its small print", () => {
	it("marks a prerequisite every other key of the row needs, so it is said once", () => {
		expect(
			dependenciesOf(["shift:read", "shift:create", "shift:update"])
		).toEqual([
			{
				keys: ["shift:create", "shift:update"],
				prerequisites: ["shift:read"],
				everyOther: true,
			},
		]);
	});

	it("keeps the explicit list when only some of the keys need it", () => {
		expect(
			dependenciesOf(["schedule:read", "schedule:create", "shift:read"])
		).toEqual([
			{
				keys: ["schedule:create"],
				prerequisites: ["schedule:read"],
				everyOther: false,
			},
		]);
	});
});
