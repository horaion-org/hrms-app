import { describe, expect, it } from "vitest";
import {
	pageParameter,
	parsePeopleSearch,
	peopleQueryOf,
	sortOf,
	sortParameter,
	statusesOf,
	statusParameter,
} from "@/features/people/peopleSearch";

describe("People URL state", () => {
	it("keeps a recognised page, sort and status", () => {
		expect(
			parsePeopleSearch({ page: 3, sort: "jobTitle,desc", status: "INACTIVE" })
		).toEqual({ page: 3, sort: "jobTitle,desc", status: "INACTIVE" });
	});

	it.each([
		{ page: 0 },
		{ page: -2 },
		{ page: 1.5 },
		{ page: "2" },
		{ sort: "email,asc" },
		{ sort: "displayName" },
		{ sort: "displayName,up" },
		{ status: "PENDING" },
		{ status: "active" },
	])("drops what it does not recognise: %o", (search) => {
		expect(parsePeopleSearch(search)).toEqual({});
	});

	it("leaves out the defaults and anything else in the URL", () => {
		expect(
			parsePeopleSearch({ page: 1, sort: "displayName,asc", search: "Moses" })
		).toEqual({});
	});

	it("sorts by name, A to Z, by default", () => {
		expect(sortOf({})).toEqual({ field: "displayName", desc: false });
		expect(sortOf({ sort: "status,desc" })).toEqual({
			field: "status",
			desc: true,
		});
	});

	it("writes a sort, page and status back to the URL, leaving out defaults", () => {
		expect(sortParameter({ field: "department", desc: true })).toBe(
			"department,desc"
		);
		expect(
			sortParameter({ field: "displayName", desc: false })
		).toBeUndefined();
		expect(pageParameter(1)).toBeUndefined();
		expect(pageParameter(4)).toBe(4);
	});

	it("ticks both statuses without a filter and filters only on exactly one", () => {
		expect(statusesOf({})).toEqual(["ACTIVE", "INACTIVE"]);
		expect(statusesOf({ status: "ACTIVE" })).toEqual(["ACTIVE"]);
		expect(statusParameter(["INACTIVE"])).toBe("INACTIVE");
		expect(statusParameter(["ACTIVE", "INACTIVE"])).toBeUndefined();
		expect(statusParameter([])).toBeUndefined();
	});

	it("builds the API query from the URL and the trimmed search text", () => {
		expect(peopleQueryOf({ page: 2, status: "ACTIVE" }, "  moses ")).toEqual({
			page: 2,
			sort: { field: "displayName", desc: false },
			status: "ACTIVE",
			search: "moses",
		});
		expect(peopleQueryOf({}, "")).toEqual({
			page: 1,
			sort: { field: "displayName", desc: false },
			search: "",
		});
	});
});
