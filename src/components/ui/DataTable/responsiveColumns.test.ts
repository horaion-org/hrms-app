import { describe, expect, it } from "vitest";
import {
	hiddenSortBandsOf,
	namingColumnOf,
	summaryColumnsOf,
	widerOf,
	type ColumnBreakpoint,
} from "@/components/ui/DataTable/responsiveColumns";

type Column = {
	id: string;
	hideBelow?: ColumnBreakpoint;
	sortValue?: () => string;
	omitFromSummary?: boolean;
	pin?: "start" | "end";
};

const sortable = (): string => "";
const ids = (columns: Array<Column> | undefined): Array<string> | undefined =>
	columns?.map((column) => column.id);

describe("widerOf", () => {
	it.each<[ColumnBreakpoint, ColumnBreakpoint, ColumnBreakpoint]>([
		["sm", "md", "md"],
		["xl", "lg", "xl"],
		["md", "md", "md"],
	])("of %s and %s is %s", (first, second, wider) => {
		expect(widerOf(first, second)).toBe(wider);
	});
});

describe("namingColumnOf", () => {
	it.each<[string, Array<Column>, string | undefined]>([
		[
			"the start-pinned column, wherever it is declared",
			[{ id: "code" }, { id: "name", pin: "start" }],
			"name",
		],
		[
			"else the first column never hidden",
			[{ id: "code", hideBelow: "md" }, { id: "name" }, { id: "email" }],
			"name",
		],
		[
			"nothing when every column hides",
			[{ id: "code", hideBelow: "md" }],
			undefined,
		],
	])("is %s", (_, columns, naming) => {
		expect(namingColumnOf(columns)?.id).toBe(naming);
	});
});

describe("summaryColumnsOf", () => {
	it("carries the hidden columns, leaving out the naming column and those omitted", () => {
		const columns: Array<Column> = [
			{ id: "name", hideBelow: "sm", pin: "start" },
			{ id: "email" },
			{ id: "branch", hideBelow: "md" },
			{ id: "notes", hideBelow: "lg", omitFromSummary: true },
			{ id: "status", hideBelow: "lg" },
		];

		expect(ids(summaryColumnsOf(columns, columns[0]))).toEqual([
			"branch",
			"status",
		]);
	});
});

describe("hiddenSortBandsOf", () => {
	const naming: Column = { id: "name", sortValue: sortable, pin: "start" };

	it("shows no menu while no sortable column hides", () => {
		expect(
			hiddenSortBandsOf(
				[
					naming,
					{ id: "email", sortValue: sortable },
					{ id: "notes", hideBelow: "md" },
				],
				naming
			)
		).toEqual({ bands: [], regularFrom: undefined });
	});

	it("offers the naming column and the hidden one until the hidden one shows", () => {
		const { bands, regularFrom } = hiddenSortBandsOf(
			[naming, { id: "branch", hideBelow: "md", sortValue: sortable }],
			naming
		);

		expect(bands.map((band) => [band.shownClasses, ids(band.columns)])).toEqual(
			[["inline-flex md:hidden", ["name", "branch"]]]
		);
		expect(regularFrom).toBe("hidden md:inline-flex");
	});

	it("drops each column from the menu at the width it comes back", () => {
		const { bands, regularFrom } = hiddenSortBandsOf(
			[
				naming,
				{ id: "branch", hideBelow: "sm", sortValue: sortable },
				{ id: "start", hideBelow: "lg", sortValue: sortable },
				{ id: "end", hideBelow: "lg", sortValue: sortable },
			],
			naming
		);

		expect(bands.map((band) => [band.shownClasses, ids(band.columns)])).toEqual(
			[
				["inline-flex sm:hidden", ["name", "branch", "start", "end"]],
				["hidden sm:inline-flex lg:hidden", ["name", "start", "end"]],
			]
		);
		expect(regularFrom).toBe("hidden lg:inline-flex");
	});

	it("offers only the hidden columns when the naming column does not sort", () => {
		const unsortedNaming: Column = { id: "name" };
		const { bands } = hiddenSortBandsOf(
			[unsortedNaming, { id: "branch", hideBelow: "xl", sortValue: sortable }],
			unsortedNaming
		);

		expect(bands.map((band) => [band.shownClasses, ids(band.columns)])).toEqual(
			[["inline-flex xl:hidden", ["branch"]]]
		);
	});

	it("never offers the naming column twice when it hides itself", () => {
		const hidingNaming: Column = {
			id: "name",
			hideBelow: "sm",
			sortValue: sortable,
			pin: "start",
		};

		expect(hiddenSortBandsOf([hidingNaming], hidingNaming).bands).toEqual([]);
	});
});
