import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
	SegmentedBar,
	type BarSegment,
} from "@/components/charts/bar/SegmentedBar";

const SEGMENTS: ReadonlyArray<BarSegment> = [
	{ id: "manual", label: "By hand", colour: "inkBlue900", value: 3 },
	{ id: "approved", label: "Leave approved", colour: "inkBlue500", value: 1 },
	{ id: "cover", label: "Cover", colour: "success600", value: 0 },
];

describe("SegmentedBar", () => {
	it("given_parts_when_rendered_then_readsOutEachPartAndDrawsItsShare", () => {
		render(<SegmentedBar label="Changes, North Point" segments={SEGMENTS} />);

		const bar = screen.getByRole("img", {
			name: "Changes, North Point: By hand 3, Leave approved 1, Cover 0",
		});
		const drawn = [...bar.children];
		expect(drawn).toHaveLength(2);
		expect(drawn[0]).toHaveStyle({ width: "75%" });
		expect(drawn[0]).toHaveClass("bg-ink-blue-900");
		expect(drawn[1]).toHaveStyle({ width: "25%" });
	});

	it("given_aLargerScale_when_rendered_then_theBarIsShorterThanItsTrack", () => {
		render(<SegmentedBar label="Changes" scaleTo={8} segments={SEGMENTS} />);

		const drawn = [...screen.getByRole("img").children];
		expect(drawn[0]).toHaveStyle({ width: "37.5%" });
		expect(drawn[1]).toHaveStyle({ width: "12.5%" });
	});

	it("given_nothingToShow_when_rendered_then_drawsAnEmptyTrack", () => {
		render(<SegmentedBar label="Changes" segments={[]} />);

		expect(screen.getByRole("img")).toBeEmptyDOMElement();
	});

	it("given_theLegend_when_rendered_then_namesEveryPartEvenAtZero", () => {
		render(<SegmentedBar legend label="Changes" segments={SEGMENTS} />);

		expect(
			screen.getAllByRole("listitem").map((item) => item.textContent)
		).toEqual(["By hand", "Leave approved", "Cover"]);
	});
});
