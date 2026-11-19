import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
	ColumnChart,
	type ColumnGroup,
} from "@/components/charts/bar/ColumnChart";
import type { ChartSeries } from "@/components/charts/chartColours";

const SERIES: ReadonlyArray<ChartSeries> = [
	{ id: "never", label: "Never staffed", colour: "inkBlue900" },
	{ id: "leave", label: "Short after leave", colour: "inkBlue200" },
];

const NORTH: ColumnGroup = {
	id: "north",
	title: "North Point",
	columns: [
		{ id: "w1", label: "2 Nov", values: { never: 9, leave: 3 } },
		{ id: "w2", label: "9 Nov", values: { never: 6 } },
	],
};

const CENTRAL: ColumnGroup = {
	id: "central",
	title: "Central Plaza",
	columns: [{ id: "w1", label: "2 Nov", values: { leave: 3 } }],
};

/** The heights of the rectangles drawn in a chart, in px. */
const heightsIn = (chart: HTMLElement): Array<number> =>
	[...chart.querySelectorAll("rect")].map((rect) =>
		Number(rect.getAttribute("height"))
	);

describe("ColumnChart", () => {
	it("given_groups_when_rendered_then_readsOutEachChartsColumns", () => {
		render(
			<ColumnChart
				groups={[NORTH, CENTRAL]}
				label="People short by week"
				series={SERIES}
			/>
		);

		expect(
			screen.getByRole("img", {
				name: "People short by week, North Point: 2 Nov 12, 9 Nov 6",
			})
		).toBeInTheDocument();
		expect(
			screen.getByRole("img", {
				name: "People short by week, Central Plaza: 2 Nov 3",
			})
		).toBeInTheDocument();
	});

	it("given_groups_when_rendered_then_drawsThemOnOneScale", () => {
		render(
			<ColumnChart groups={[NORTH, CENTRAL]} label="Short" series={SERIES} />
		);

		// The tallest column, 12, is the plot's 96 px: 9 and 3 of it; 6 is half; Central's 3 matches North's 3.
		const [north, central] = screen.getAllByRole("img");
		expect(heightsIn(north!)).toEqual([72, 24, 48]);
		expect(heightsIn(central!)).toEqual([24]);
	});

	it("given_aColumn_when_rendered_then_writesItsAmountAboveAndItsLabelBelow", () => {
		render(<ColumnChart groups={[NORTH]} label="Short" series={SERIES} />);

		const texts = [...screen.getByRole("img").querySelectorAll("text")].map(
			(text) => text.textContent
		);
		expect(texts).toEqual(["12", "2 Nov", "6", "9 Nov"]);
	});

	it("given_severalSeries_when_rendered_then_namesThemOnceInALegend", () => {
		render(
			<ColumnChart groups={[NORTH, CENTRAL]} label="Short" series={SERIES} />
		);

		expect(
			screen.getAllByRole("listitem").map((item) => item.textContent)
		).toEqual(["Never staffed", "Short after leave"]);
	});

	it("given_oneSeries_when_rendered_then_needsNoLegend", () => {
		render(
			<ColumnChart groups={[NORTH]} label="Short" series={SERIES.slice(0, 1)} />
		);

		expect(screen.queryByRole("list")).toBeNull();
	});

	it("given_nothingInAColumn_when_rendered_then_drawsNoBarAndWritesZero", () => {
		const empty: ColumnGroup = {
			id: "harbour",
			columns: [{ id: "w1", label: "2 Nov", values: {} }],
		};
		render(<ColumnChart groups={[empty]} label="Short" series={SERIES} />);

		const chart = screen.getByRole("img", { name: "Short: 2 Nov 0" });
		expect(chart.querySelectorAll("rect")).toHaveLength(0);
		expect(chart).toHaveTextContent("0");
	});

	it("given_narrowColumns_when_rendered_then_theChartIsItsOwnWidthNotScaled", () => {
		render(
			<ColumnChart groups={[NORTH]} label="Short" series={SERIES} size="sm" />
		);

		// Two 16 px columns and one 8 px gap; no viewBox, so labels keep their size.
		const chart = screen.getByRole("img");
		expect(chart).toHaveAttribute("width", "40");
		expect(chart).not.toHaveAttribute("viewBox");
	});
});
