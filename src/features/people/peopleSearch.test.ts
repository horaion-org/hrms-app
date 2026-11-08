import { describe, expect, it } from "vitest";
import {
	pageParameter,
	parsePeopleSearch,
	parseProfileSearch,
	peopleQueryOf,
	sortOf,
	sortParameter,
	statusesOf,
	termsFilterApplies,
	statusParameter,
} from "@/features/people/peopleSearch";

describe("People URL state", () => {
	it("keeps a recognised page, sort, status, Branch, Department and terms", () => {
		expect(
			parsePeopleSearch({
				page: 3,
				sort: "jobTitle,desc",
				status: "INACTIVE",
				terms: "terms-1",
				branch: "b-1",
				department: "d-1",
			})
		).toEqual({
			page: 3,
			sort: "jobTitle,desc",
			status: "INACTIVE",
			terms: "terms-1",
			branch: "b-1",
			department: "d-1",
		});
	});

	it("keeps whether people who have signed in or not are listed, and drops anything else there", () => {
		expect(parsePeopleSearch({ invitation: "pending" })).toEqual({
			invitation: "pending",
		});
		expect(parsePeopleSearch({ invitation: "maybe" })).toEqual({});
		expect(peopleQueryOf({ invitation: "pending" }, "")).toHaveProperty(
			"invitationPending",
			true
		);
		expect(peopleQueryOf({ invitation: "accepted" }, "")).toHaveProperty(
			"invitationPending",
			false
		);
		expect(peopleQueryOf({}, "")).not.toHaveProperty("invitationPending");
	});

	it("drops terms that are not an id", () => {
		expect(parsePeopleSearch({ terms: "" })).toEqual({});
		expect(parsePeopleSearch({ terms: 7 })).toEqual({});
	});

	it("applies terms only for someone who may read them, and never while only inactive people are shown", () => {
		expect(termsFilterApplies({}, true)).toBe(true);
		expect(termsFilterApplies({ status: "ACTIVE" }, true)).toBe(true);
		expect(termsFilterApplies({ status: "INACTIVE" }, true)).toBe(false);
		expect(termsFilterApplies({}, false)).toBe(false);
		expect(
			peopleQueryOf({ status: "INACTIVE", terms: "terms-1" }, "", {}, true)
		).not.toHaveProperty("employmentTermsId");
	});

	it("asks for the URL's terms only for someone who may filter by them", () => {
		const search = { terms: "terms-1" };

		expect(peopleQueryOf(search, "", {}, true)).toEqual({
			page: 1,
			sort: { field: "displayName", desc: false },
			search: "",
			employmentTermsId: "terms-1",
		});
		expect(peopleQueryOf(search, "", {}, false)).not.toHaveProperty(
			"employmentTermsId"
		);
		expect(peopleQueryOf(search, "")).not.toHaveProperty("employmentTermsId");
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
		{ branch: "" },
		{ branch: 7 },
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
		expect(peopleQueryOf({ branch: "b-9" }, "", { branchId: "b-1" })).toEqual({
			page: 1,
			sort: { field: "displayName", desc: false },
			search: "",
			branchId: "b-1",
		});
		expect(
			peopleQueryOf({}, "", { branchId: "b-1", departmentId: "d-1" })
		).toEqual({
			page: 1,
			sort: { field: "displayName", desc: false },
			search: "",
			branchId: "b-1",
			departmentId: "d-1",
		});
	});
});

describe("a person's URL state", () => {
	it("opens the page ready to edit only for edit=true", () => {
		expect(parseProfileSearch({ edit: true })).toEqual({ edit: true });
		expect(parseProfileSearch({})).toEqual({});
		expect(parseProfileSearch({ edit: "true" })).toEqual({});
		expect(parseProfileSearch({ edit: false, page: 2 })).toEqual({});
	});
});
