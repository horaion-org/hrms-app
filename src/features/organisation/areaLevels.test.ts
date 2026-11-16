import { describe, expect, it } from "vitest";
import { authTestI18n } from "@/features/auth/testingI18n";
import {
	areaLevel,
	areaLevels,
	canChooseLevel,
	choosableLevels,
	keysAtLevel,
	offeredKeys,
	roleSentence,
	withAreaLevel,
} from "@/features/organisation/areaLevels";

const t = authTestI18n.t.bind(authTestI18n);
const SCHEDULING = offeredKeys("scheduling", "LOCAL");
const LEAVE = offeredKeys("leave", "LOCAL");

describe("an area's level", () => {
	it("is No access, Can view with every read, Can manage with every key, and Custom otherwise", () => {
		expect(areaLevel(LEAVE, [])).toBe("NONE");
		expect(areaLevel(LEAVE, ["leave_request:read"])).toBe("VIEW");
		expect(areaLevel(LEAVE, LEAVE)).toBe("MANAGE");
		expect(
			areaLevel(LEAVE, ["leave_request:read", "leave_request:review"])
		).toBe("CUSTOM");
		// Scheduling's reads are schedules, shifts and constraints together.
		expect(areaLevel(SCHEDULING, ["schedule:read"])).toBe("CUSTOM");
		expect(areaLevel(SCHEDULING, keysAtLevel(SCHEDULING, "VIEW"))).toBe("VIEW");
	});

	it("only counts the keys the role's kind may hold", () => {
		const company = offeredKeys("settingsLeave", "COMPANY");
		const local = offeredKeys("settingsLeave", "LOCAL");
		expect(company).toContain("leave_type:read");
		expect(local).toEqual(["leave_duration:read", "leave_duration:update"]);
		expect(areaLevel(local, local)).toBe("MANAGE");
		expect(offeredKeys("settingsWorkPolicy", "LOCAL")).toEqual([]);
	});

	it("offers Can manage only where there is more than seeing", () => {
		expect(choosableLevels(offeredKeys("reports"))).toEqual(["NONE", "VIEW"]);
		expect(choosableLevels(LEAVE)).toEqual(["NONE", "VIEW", "MANAGE"]);
	});

	it("can't be chosen when it would give a key the person may not give", () => {
		const unavailable = ["leave_request:review"] as const;
		expect(canChooseLevel(LEAVE, "VIEW", [], unavailable)).toBe(true);
		expect(canChooseLevel(LEAVE, "MANAGE", [], unavailable)).toBe(false);
		// A key the role already holds stays, whoever edits it.
		expect(
			canChooseLevel(LEAVE, "MANAGE", ["leave_request:review"], unavailable)
		).toBe(true);
	});
});

describe("choosing an area's level", () => {
	it("ticks the level's keys and clears the area's others, leaving other areas alone", () => {
		expect(withAreaLevel(["report:read"], LEAVE, "MANAGE")).toEqual(
			expect.arrayContaining(["report:read", ...LEAVE])
		);
		expect(
			withAreaLevel(["report:read", ...LEAVE], LEAVE, "VIEW").sort()
		).toEqual(["leave_request:read", "report:read"]);
		expect(withAreaLevel(["report:read", ...LEAVE], LEAVE, "NONE")).toEqual([
			"report:read",
		]);
	});

	it("skips keys that can't be given", () => {
		expect(
			withAreaLevel([], LEAVE, "MANAGE", ["leave_request:review"]).sort()
		).toEqual(["leave_request:create", "leave_request:read"]);
	});
});

describe("a role in one sentence", () => {
	it("names what it manages, views and holds some of, in the menu's order", () => {
		expect(
			roleSentence(
				[...LEAVE, "report:read", "member_profile:read", "schedule:read"],
				"LOCAL",
				t,
				"en"
			)
		).toBe(
			"This role manages Leave, views Reports, and has some of Scheduling and People."
		);
	});

	it("says when it allows nothing yet", () => {
		expect(roleSentence([], "LOCAL", t, "en")).toBe(
			"This role allows nothing yet beyond a person’s own roster, leave and preferences."
		);
	});

	it("leaves out areas a local role can't hold", () => {
		expect(areaLevels([], "LOCAL")).toContainEqual({
			area: "settingsWorkPolicy",
			level: "NONE",
		});
	});
});
