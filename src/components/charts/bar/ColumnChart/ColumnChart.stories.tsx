import type { Meta, StoryObj } from "@storybook/react-vite";
import { ColumnChart } from "@/components/charts/bar/ColumnChart";

const WEEKS = ["2 Nov", "9 Nov", "16 Nov", "23 Nov"];

/** A Branch's four weeks, each with people never staffed and short after leave. */
const weeksOf = (
	amounts: ReadonlyArray<[number, number]>
): Array<{ id: string; label: string; values: Record<string, number> }> =>
	amounts.map(([never, leave], index) => ({
		id: WEEKS[index] ?? String(index),
		label: WEEKS[index] ?? "",
		values: { never, leave },
	}));

const meta = {
	title: "Charts/Bar/ColumnChart",
	component: ColumnChart,
	args: {
		label: "People short by week",
		series: [
			{ id: "never", label: "Never staffed", colour: "inkBlue900" },
			{ id: "leave", label: "Short after leave", colour: "inkBlue200" },
		],
		groups: [
			{
				id: "north",
				title: "North Point",
				columns: weeksOf([
					[9, 4],
					[9, 4],
					[9, 5],
					[9, 3],
				]),
			},
			{
				id: "central",
				title: "Central Plaza",
				columns: weeksOf([
					[0, 1],
					[0, 0],
					[0, 2],
					[0, 0],
				]),
			},
		],
	},
} satisfies Meta<typeof ColumnChart>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Two Branches side by side on one scale. */
export const SmallMultiples: Story = {};

export const OneSeriesManyColumns: Story = {
	args: {
		label: "People short by day",
		size: "sm",
		series: [{ id: "short", label: "People short", colour: "inkBlue900" }],
		groups: [
			{
				id: "all",
				columns: [2, 1, 0, 0, 3, 0, 0, 0, 0, 0, 1, 0, 0, 0].map(
					(short, index) => ({
						id: String(index),
						label: "MTWTFSS"[index % 7] ?? "",
						values: { short },
					})
				),
			},
		],
	},
};
