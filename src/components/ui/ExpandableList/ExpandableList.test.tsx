import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { COLLAPSED_ROW_COUNT, ExpandableList } from "./ExpandableList";

const rows = Array.from({ length: 12 }, (_, index) => `Row ${index + 1}`);

const renderList = (items: ReadonlyArray<string>): void => {
	render(
		<ExpandableList
			items={items}
			keyOf={(item) => item}
			renderItem={(item) => item}
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

	it("offers no toggle when every row already shows", () => {
		renderList(rows.slice(0, COLLAPSED_ROW_COUNT));
		expect(screen.queryByRole("button")).not.toBeInTheDocument();
	});
});
