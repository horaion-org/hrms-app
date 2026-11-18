import { describe, expect, it } from "vitest";
import { parseTimelineSearch } from "@/features/scheduling/timeline/timelineSearch";

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
