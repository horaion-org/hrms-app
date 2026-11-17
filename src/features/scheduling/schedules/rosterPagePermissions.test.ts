import { describe, expect, it } from "vitest";
import {
	generatedScheduleFixture,
	scheduleFixture,
} from "@/features/scheduling/schedules/fixtures";
import {
	rosterPagePermissions,
	type RosterPagePermissions,
} from "@/features/scheduling/schedules/rosterPagePermissions";
import type { PermissionKey } from "@/features/workspace/permissionKeys";
import type { Access } from "@/features/workspace/useAccess";
import type { ScopeRef } from "@/features/workspace/scopes";

/** The Department every schedule fixture belongs to. */
const DEPARTMENT_ID = "d-1";

/** Access holding `held` at the fixtures' Department only, as `useAccess` answers. */
const accessHolding = (
	held: ReadonlyArray<PermissionKey>
): Pick<Access, "can" | "canAll"> => {
	const holds = (permission: PermissionKey, target: ScopeRef): boolean =>
		target.kind === "department" &&
		target.id === DEPARTMENT_ID &&
		held.includes(permission);
	return {
		can: holds,
		canAll: (permissions, target) =>
			target !== "anywhere" &&
			permissions.length > 0 &&
			permissions.every((permission) => holds(permission, target)),
	};
};

/** Every key the page asks about. */
const EVERY_KEY: ReadonlyArray<PermissionKey> = [
	"schedule:edit_shift",
	"schedule:read",
	"schedule:publish",
	"schedule:generate",
	"schedule:create",
	"leave_request:read",
	"leave_request:review",
];

const NOTHING: RosterPagePermissions = {
	mayEditShifts: false,
	mayValidate: false,
	mayReject: false,
	mayWithdraw: false,
	mayGenerate: false,
	mayRead: false,
	mayCreateHere: false,
	mayHandleLeave: false,
};

/** Everything the keys allow at any standing; the standing then takes some away. */
const BY_KEYS_ALONE = {
	mayRead: true,
	mayCreateHere: true,
	mayHandleLeave: true,
};

describe("rosterPagePermissions", () => {
	it("allows nothing until the schedule is read", () => {
		expect(rosterPagePermissions(undefined, accessHolding(EVERY_KEY))).toEqual(
			NOTHING
		);
	});

	it.each<
		[
			string,
			Parameters<typeof generatedScheduleFixture>[0],
			RosterPagePermissions,
		]
	>([
		[
			"a generated roster awaiting its decision",
			{ status: "GENERATED" },
			{
				...NOTHING,
				...BY_KEYS_ALONE,
				mayEditShifts: true,
				mayValidate: true,
				mayReject: true,
				mayGenerate: true,
			},
		],
		[
			"a published roster",
			{ status: "PUBLISHED" },
			{
				...NOTHING,
				...BY_KEYS_ALONE,
				mayEditShifts: true,
				mayValidate: true,
				mayWithdraw: true,
			},
		],
		[
			"a rejected roster",
			{ status: "REJECTED" },
			{ ...NOTHING, ...BY_KEYS_ALONE, mayGenerate: true },
		],
		[
			"a roster still generating",
			{ status: "GENERATION_REQUESTED" },
			{ ...NOTHING, ...BY_KEYS_ALONE },
		],
	])("allows on %s what its standing allows", (_, overrides, expected) => {
		expect(
			rosterPagePermissions(
				generatedScheduleFixture(overrides),
				accessHolding(EVERY_KEY)
			)
		).toEqual(expected);
	});

	it.each<[PermissionKey, keyof RosterPagePermissions]>([
		["schedule:edit_shift", "mayEditShifts"],
		["schedule:read", "mayValidate"],
		["schedule:read", "mayRead"],
		["schedule:publish", "mayReject"],
		["schedule:generate", "mayGenerate"],
		["schedule:create", "mayCreateHere"],
		["leave_request:review", "mayHandleLeave"],
	])("needs %s for %s", (missing, permission) => {
		const held = EVERY_KEY.filter((key) => key !== missing);
		const generated = generatedScheduleFixture({ status: "GENERATED" });

		expect(
			rosterPagePermissions(generated, accessHolding(held))[permission]
		).toBe(false);
	});

	it("asks at the schedule's own Department", () => {
		const elsewhere = scheduleFixture({ departmentId: "d-2" });

		expect(rosterPagePermissions(elsewhere, accessHolding(EVERY_KEY))).toEqual(
			NOTHING
		);
	});
});
