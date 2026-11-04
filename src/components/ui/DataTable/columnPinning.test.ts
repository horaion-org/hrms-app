import { describe, expect, it } from "vitest";
import {
	pinnedCellClasses,
	pinningStateOf,
	stickyStartClasses,
} from "@/components/ui/DataTable/columnPinning";

describe("pinningStateOf", () => {
	it("pins nothing when no column asks", () => {
		expect(pinningStateOf([{ id: "name" }, { id: "code" }])).toEqual({
			start: [],
			end: [],
		});
	});

	it("pins one column to each side, wherever it is declared", () => {
		expect(
			pinningStateOf([
				{ id: "actions", pin: "end" },
				{ id: "code" },
				{ id: "name", pin: "start" },
			])
		).toEqual({ start: ["name"], end: ["actions"] });
	});

	it("refuses a second column on the same side", () => {
		expect(() =>
			pinningStateOf([
				{ id: "name", pin: "start" },
				{ id: "code", pin: "start" },
			])
		).toThrow("at most one column per side");
	});
});

describe("stickyStartClasses", () => {
	it("offsets by 3rem per leading cell", () => {
		expect(stickyStartClasses(0)).toContain("md:start-0");
		expect(stickyStartClasses(1)).toContain("md:start-12");
		expect(stickyStartClasses(2)).toContain("md:start-24");
		expect(stickyStartClasses(2)).toContain("md:sticky");
	});

	it("refuses an offset it has no class for", () => {
		expect(() => stickyStartClasses(3)).toThrow("no sticky offset");
	});
});

describe("pinnedCellClasses", () => {
	it("sticks a start column after the leading cells, with its shadow on the end side", () => {
		const classes = pinnedCellClasses("start", 1);
		expect(classes).toContain("md:start-12");
		expect(classes).toContain(
			"md:group-data-overflows-start:after:opacity-100"
		);
	});

	it("sticks an end column to the end, with its shadow on the start side", () => {
		const classes = pinnedCellClasses("end", 1);
		expect(classes).toContain("md:end-0");
		expect(classes).toContain("md:group-data-overflows-end:before:opacity-100");
	});

	it("adds nothing to an unpinned column", () => {
		expect(pinnedCellClasses(false, 2)).toBeUndefined();
	});
});
