// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
	compare,
	lineCount,
	lineLimitOf,
	sizeProblemOf,
} from "./check-file-size.mjs";

const PAGE = "src/pages/Big.tsx";

describe("lineCount", () => {
	it("counts lines as wc -l does for a file ending in a newline", () => {
		expect(lineCount("a\nb\n")).toBe(2);
	});

	it("counts a last line without a newline", () => {
		expect(lineCount("a\nb")).toBe(2);
	});
});

describe("lineLimitOf", () => {
	it("holds source files to 500 lines and tests to 1,500", () => {
		expect(lineLimitOf("src/common/weeks.ts")).toBe(500);
		expect(lineLimitOf("src/common/weeks.test.ts")).toBe(1500);
	});

	it.each([
		"src/components/ui/Badge/Badge.stories.tsx",
		"src/features/scheduling/constraints/fixtures.ts",
		"src/features/scheduling/roster/rosterIssueFixtures.ts",
		"src/routeTree.gen.ts",
		"src/features/workspace/permissionContract.generated.ts",
	])("exempts %s", (path) => {
		expect(lineLimitOf(path)).toBeUndefined();
	});
});

describe("sizeProblemOf", () => {
	it("passes an unlisted file within its limit", () => {
		expect(sizeProblemOf(PAGE, 500, undefined)).toBeUndefined();
	});

	it("names an unlisted file over its limit and what to do", () => {
		expect(sizeProblemOf(PAGE, 501, undefined)).toBe(
			"src/pages/Big.tsx has 501 lines, over the limit of 500: split it into smaller files, each with one job"
		);
	});

	it("passes a listed file that shrank but is still over the limit", () => {
		expect(sizeProblemOf(PAGE, 700, 900)).toBeUndefined();
	});

	it("names a listed file that grew past its ceiling", () => {
		expect(sizeProblemOf(PAGE, 901, 900)).toBe(
			"src/pages/Big.tsx has 901 lines, over its ceiling of 900 in LINE_CEILINGS: split it rather than raise the ceiling"
		);
	});

	it("says which line to delete once a listed file is within the limit", () => {
		expect(sizeProblemOf(PAGE, 500, 900)).toBe(
			"back within the limit of 500 lines, delete it from LINE_CEILINGS: src/pages/Big.tsx"
		);
	});

	it("ignores an exempt file whatever its size", () => {
		expect(
			sizeProblemOf("src/features/a/fixtures.ts", 5000, undefined)
		).toBeUndefined();
	});
});

describe("compare", () => {
	it("says which line to delete when a listed file no longer exists", () => {
		expect(compare(new Map(), { [PAGE]: 900 })).toEqual([
			"no longer exists, delete it from LINE_CEILINGS: src/pages/Big.tsx",
		]);
	});

	it("reports each file's problem", () => {
		const lineCounts = new Map([
			[PAGE, 950],
			["src/pages/Small.tsx", 10],
		]);

		expect(compare(lineCounts, { [PAGE]: 900 })).toHaveLength(1);
	});
});
