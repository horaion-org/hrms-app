import { describe, expect, it } from "vitest";
import {
	departmentTimelineLink,
	parseTimelineSearch,
} from "@/features/scheduling/timeline/timelineSearch";

describe("parseTimelineSearch", () => {
	it.each([
		[
			"every key",
			{ department: "d-1", from: "2027-02-08", view: "two", schedule: "s-1" },
			{ department: "d-1", from: "2027-02-08", view: "two", schedule: "s-1" },
		],
		[
			"unreadable values as absent",
			{ department: "", from: "not a day", view: "year", schedule: "" },
			{},
		],
	])("reads %s", (_, search, expected) => {
		expect(parseTimelineSearch(search)).toEqual(expected);
	});
});

describe("departmentTimelineLink", () => {
	it.each([
		["a Monday", "2027-02-08", "2027-02-08"],
		["a Thursday", "2027-02-11", "2027-02-08"],
		["a Sunday", "2027-02-14", "2027-02-08"],
	])("opens on the week of %s", (_, day, monday) => {
		expect(departmentTimelineLink("d-1", day)).toEqual({
			to: "/scheduling/department",
			search: { department: "d-1", from: monday },
		});
	});
});
