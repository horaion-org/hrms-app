import { describe, expect, it } from "vitest";
import {
	parseSchedulingSearch,
	SCHEDULING_KEYS,
	SCHEDULING_VIEW_KEYS,
	SCHEDULING_VIEWS,
	schedulingViewOf,
	schedulingViewsOf,
} from "@/features/scheduling/schedulingSearch";
import type { PermissionKey } from "@/features/workspace/permissionKeys";

/** A person holding exactly these keys somewhere. */
const holding =
	(...held: Array<PermissionKey>) =>
	(keys: ReadonlyArray<PermissionKey>): boolean =>
		keys.some((key) => held.includes(key));

describe("parseSchedulingSearch", () => {
	it("given_theConstraintsView_when_parsed_then_keepsIt", () => {
		expect(parseSchedulingSearch({ view: "constraints" })).toEqual({
			view: "constraints",
		});
	});

	it("given_everyPart_when_parsed_then_keepsThem", () => {
		expect(
			parseSchedulingSearch({
				view: "shifts",
				branch: "b-1",
				department: "d-1",
			})
		).toEqual({ view: "shifts", branch: "b-1", department: "d-1" });
	});

	it("given_theSchedulesView_when_parsed_then_leavesItOutAsTheDefault", () => {
		expect(parseSchedulingSearch({ view: "schedules" })).toEqual({});
		expect(parseSchedulingSearch({})).toEqual({});
	});

	it("given_unknownOrMalformedParts_when_parsed_then_dropsThem", () => {
		expect(
			parseSchedulingSearch({ view: "roster", branch: "", page: 2 })
		).toEqual({});
	});
});

describe("schedulingViewsOf", () => {
	it.each<[string, Array<PermissionKey>, Array<string>]>([
		[
			"every key",
			["schedule:read", "shift:read", "constraint:read"],
			["schedules", "shifts", "constraints"],
		],
		[
			"schedule:read and shift:read",
			["schedule:read", "shift:read"],
			["schedules", "shifts"],
		],
		[
			"schedule:read and constraint:read",
			["schedule:read", "constraint:read"],
			["schedules", "constraints"],
		],
		[
			"shift:read and constraint:read",
			["shift:read", "constraint:read"],
			["shifts", "constraints"],
		],
		["schedule:read only", ["schedule:read"], ["schedules"]],
		["shift:read only", ["shift:read"], ["shifts"]],
		["constraint:read only", ["constraint:read"], ["constraints"]],
		["none of them", ["leave_request:read"], []],
	])(
		"given_%s_when_listed_then_offersThoseViewsInOrder",
		(_held, keys, views) => {
			expect(schedulingViewsOf(holding(...keys))).toEqual(views);
		}
	);
});

describe("schedulingViewOf", () => {
	it("given_anOfferedView_when_requested_then_showsIt", () => {
		expect(schedulingViewOf("shifts", ["schedules", "shifts"])).toBe("shifts");
	});

	it("given_anUnofferedOrNoView_when_requested_then_fallsBackToTheFirst", () => {
		expect(schedulingViewOf("schedules", ["shifts"])).toBe("shifts");
		expect(schedulingViewOf(undefined, ["schedules", "shifts"])).toBe(
			"schedules"
		);
		expect(schedulingViewOf("shifts", [])).toBeUndefined();
	});
});

describe("SCHEDULING_KEYS", () => {
	it("given_theViews_when_read_then_isEveryViewsReadKeys", () => {
		expect(SCHEDULING_KEYS).toEqual(
			SCHEDULING_VIEWS.flatMap((view) => SCHEDULING_VIEW_KEYS[view])
		);
		expect(SCHEDULING_KEYS).toEqual([
			"schedule:read",
			"shift:read",
			"constraint:read",
		]);
	});
});
