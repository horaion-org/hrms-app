import { describe, expect, it } from "vitest";
import { parseRosterSearch } from "./rosterSearch";

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
	])("reads %j as %j", (search, view) => {
		expect(parseRosterSearch(search)).toEqual(view);
	});
});
