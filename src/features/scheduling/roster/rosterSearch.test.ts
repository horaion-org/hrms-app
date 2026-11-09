import { describe, expect, it } from "vitest";
import { issuesAboutOf, parseRosterSearch } from "./rosterSearch";

describe("parseRosterSearch", () => {
	it.each([
		[{}, {}],
		[
			{ week: "2026-10-12", panel: "issues" },
			{ week: "2026-10-12", panel: "issues" },
		],
		[{ week: "2026-10-13" }, {}],
		[{ panel: "everything" }, {}],
		[{ cell: "m-1|2026-10-12", panel: "issues" }, { cell: "m-1|2026-10-12" }],
		[{ cell: "m-1" }, {}],
		[
			{ panel: "issues", member: "m-2", date: "2026-10-17" },
			{ panel: "issues", member: "m-2" },
		],
		[
			{ panel: "issues", date: "2026-10-17" },
			{ panel: "issues", date: "2026-10-17" },
		],
		[{ panel: "changes", member: "m-2" }, { panel: "changes" }],
		[{ member: "m-2" }, {}],
		[{ panel: "issues", date: "Saturday" }, { panel: "issues" }],
		[
			{ week: "2026-10-12", day: "2026-10-14", cell: "m-1|2026-10-14" },
			{ week: "2026-10-12", day: "2026-10-14", cell: "m-1|2026-10-14" },
		],
		[{ day: "Wednesday" }, {}],
	])("reads %j as %j", (search, view) => {
		expect(parseRosterSearch(search)).toEqual(view);
	});
});

describe("parseRosterSearch: the approval panel", () => {
	it("opens the Approval list its link names", () => {
		expect(parseRosterSearch({ panel: "approval" })).toEqual({
			panel: "approval",
		});
		expect(parseRosterSearch({ panel: "approval", member: "m-1" })).toEqual({
			panel: "approval",
		});
	});
});

describe("issuesAboutOf", () => {
	it.each([
		[{}, undefined],
		[{ member: "m-2" }, { kind: "member", membershipId: "m-2" }],
		[{ date: "2026-10-17" }, { kind: "date", date: "2026-10-17" }],
	])("reads %j as %j", (view, about) => {
		expect(issuesAboutOf(view)).toEqual(about);
	});
});
