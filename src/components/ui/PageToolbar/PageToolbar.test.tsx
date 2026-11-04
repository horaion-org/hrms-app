import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PageToolbar } from "@/components/ui/PageToolbar";

describe("PageToolbar", () => {
	it("given_filtersAndActions_when_rendered_then_isALabelledGroupInFiltersThenActionsOrder", () => {
		render(
			<PageToolbar
				actions={<button type="button">Add employee</button>}
				filters={<button type="button">Filters</button>}
				label="People list controls"
			/>
		);

		const group = screen.getByRole("group", { name: "People list controls" });
		expect(
			within(group)
				.getAllByRole("button")
				.map((button) => button.textContent)
		).toEqual(["Filters", "Add employee"]);
	});

	it("given_onlyActions_when_rendered_then_leavesTheOtherZonesOut", () => {
		const { container } = render(
			<PageToolbar
				actions={<button type="button">Add employee</button>}
				label="People list controls"
			/>
		);

		expect(container.querySelectorAll('[role="group"] > div')).toHaveLength(1);
	});

	it("given_chips_when_rendered_then_showsThemAfterTheControls", () => {
		render(
			<PageToolbar
				actions={<button type="button">Add employee</button>}
				chips={<p>Showing: Active</p>}
				filters={<button type="button">Filters</button>}
				label="People list controls"
			/>
		);

		const group = screen.getByRole("group", { name: "People list controls" });
		expect(group.lastElementChild).toHaveTextContent("Showing: Active");
	});
});
