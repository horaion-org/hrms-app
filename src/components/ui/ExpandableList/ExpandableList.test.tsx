import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { COLLAPSED_ROW_COUNT, ExpandableList } from "./ExpandableList";

const rows = Array.from({ length: 12 }, (_, index) => `Row ${index + 1}`);

const renderList = (
	items: ReadonlyArray<string>,
	seeAll?: ReactNode,
	collapsedCount?: number
): void => {
	render(
		<ExpandableList
			collapsedCount={collapsedCount}
			items={items}
			keyOf={(item) => item}
			renderItem={(item) => item}
			seeAll={seeAll}
		/>
	);
};

describe("ExpandableList", () => {
	it("shows the first rows and a toggle that opens and closes the rest", async () => {
		renderList(rows);
		expect(screen.getAllByRole("listitem")).toHaveLength(COLLAPSED_ROW_COUNT);
		const toggle = screen.getByRole("button", { expanded: false });
		await userEvent.click(toggle);
		expect(screen.getAllByRole("listitem")).toHaveLength(rows.length);
		await userEvent.click(screen.getByRole("button", { expanded: true }));
		expect(screen.getAllByRole("listitem")).toHaveLength(COLLAPSED_ROW_COUNT);
	});

	it("stops at the number of rows it is given", () => {
		renderList(rows, undefined, 3);
		expect(screen.getAllByRole("listitem")).toHaveLength(3);
		expect(screen.getByRole("button", { expanded: false })).toBeVisible();
	});

	it("offers no toggle when every row already shows", () => {
		renderList(rows.slice(0, COLLAPSED_ROW_COUNT));
		expect(screen.queryByRole("button")).not.toBeInTheDocument();
	});

	it("links to the full page in place of the toggle, once the rows overflow", () => {
		renderList(rows, <a href="/leave">See all 12</a>);
		expect(screen.getAllByRole("listitem")).toHaveLength(COLLAPSED_ROW_COUNT);
		expect(screen.getByRole("link", { name: "See all 12" })).toBeVisible();
		expect(screen.queryByRole("button")).not.toBeInTheDocument();
	});

	it("shows no link to the full page while every row already shows", () => {
		renderList(
			rows.slice(0, COLLAPSED_ROW_COUNT),
			<a href="/leave">See all 5</a>
		);
		expect(screen.queryByRole("link")).not.toBeInTheDocument();
	});
});
