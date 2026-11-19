// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
	AREA_RULE,
	areaOf,
	bidirectionalPairs,
	compare,
	FEATURE_RULE,
	featureOf,
	importedAreas,
	importedFeatures,
	importsByGroup,
	topLevelProblems,
} from "./check-feature-cycles.mjs";

describe("importedFeatures", () => {
	it("reads static and dynamic feature imports", () => {
		const source = [
			'import { a } from "@/features/leave/api";',
			'const b = await import("@/features/people/api");',
			'import { c } from "@/common/weeks";',
		].join("\n");

		expect([...importedFeatures(source)]).toEqual(["leave", "people"]);
	});
});

describe("importedAreas", () => {
	it("reads scheduling area folders, not the files at the top of scheduling", () => {
		const source = [
			'import { a } from "@/features/scheduling/roster/roster";',
			'import { b } from "@/features/scheduling/paths";',
			'import { C } from "@/features/scheduling/RosterGrid";',
		].join("\n");

		expect([...importedAreas(source)]).toEqual(["roster"]);
	});
});

describe("featureOf and areaOf", () => {
	it("names the feature of a path", () => {
		expect(featureOf("src/features/leave/api.ts")).toBe("leave");
	});

	it("names the area of a file inside one", () => {
		expect(areaOf("src/features/scheduling/roster/roster.ts")).toBe("roster");
	});

	it.each([
		"src/features/scheduling/paths.ts",
		"src/features/scheduling/RosterGrid/RosterGrid.tsx",
		"src/features/leave/api.ts",
	])("names no area for %s", (path) => {
		expect(areaOf(path)).toBeUndefined();
	});
});

describe("importsByGroup and bidirectionalPairs", () => {
	it("finds two areas that import each other", () => {
		const files = [
			{
				path: "src/features/scheduling/dates/a.ts",
				source: 'import { m } from "@/features/scheduling/months/m";',
			},
			{
				path: "src/features/scheduling/months/m.ts",
				source: 'import { a } from "@/features/scheduling/dates/a";',
			},
			{
				path: "src/features/scheduling/roster/r.ts",
				source: 'import { a } from "@/features/scheduling/dates/a";',
			},
		];

		expect(
			bidirectionalPairs(importsByGroup(files, areaOf, importedAreas))
		).toEqual(["dates<->months"]);
	});

	it("ignores a group importing itself", () => {
		const files = [
			{
				path: "src/features/leave/a.ts",
				source: 'import { b } from "@/features/leave/b";',
			},
		];

		expect(
			bidirectionalPairs(importsByGroup(files, featureOf, importedFeatures))
		).toEqual([]);
	});
});

describe("compare", () => {
	it("passes when the pairs found are the pairs listed", () => {
		expect(compare(["a<->b"], ["a<->b"], FEATURE_RULE)).toEqual([]);
	});

	it("names a new pair and what to do", () => {
		expect(compare(["dates<->months"], [], AREA_RULE)).toEqual([
			"scheduling areas import each other: dates<->months; move the shared code to the area that owns it, or to a file at the top of features/scheduling",
		]);
	});

	it("says which line to delete when a listed pair is broken", () => {
		expect(compare([], ["leave<->people"], FEATURE_RULE)).toEqual([
			"no longer a cycle, delete it from ALLOWED_PAIRS: leave<->people",
		]);
	});
});

describe("topLevelProblems", () => {
	it("passes when the top level holds exactly the listed entries", () => {
		expect(topLevelProblems(["roster", "paths.ts"], ["paths.ts", "roster"])).toEqual(
			[]
		);
	});

	it("names an unlisted entry and what to do", () => {
		expect(topLevelProblems(["roster", "RosterGrid"], ["roster"])).toEqual([
			'src/features/scheduling/RosterGrid is not listed in SCHEDULING_TOP_LEVEL: move it into the area that owns it (src/features/scheduling/README.md, "Map"), or list a new area there',
		]);
	});

	it("says which line to delete when a listed entry is gone", () => {
		expect(topLevelProblems(["roster"], ["roster", "steps.ts"])).toEqual([
			"no longer at the top of features/scheduling, delete it from SCHEDULING_TOP_LEVEL: steps.ts",
		]);
	});
});
