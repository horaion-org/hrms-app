import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import { beforeAll, describe, expect, it, vi } from "vitest";
import en from "@/assets/locales/en/translations.json";
import { PageToolbar } from "@/components/ui/PageToolbar";

beforeAll(async () => {
	await createInstance()
		.use(initReactI18next)
		.init({ lng: "en", resources: { en: { translation: en } } });
});

describe("PageToolbar", () => {
	it("given_everyZone_when_rendered_then_isALabelledGroupInScopeFiltersActionsOrder", () => {
		render(
			<PageToolbar
				actions={<button type="button">Add employee</button>}
				filters={<button type="button">Status</button>}
				label="People list controls"
				scope={<button type="button">Branch</button>}
			/>
		);

		const group = screen.getByRole("group", { name: "People list controls" });
		expect(
			within(group)
				.getAllByRole("button")
				.map((button) => button.textContent)
		).toEqual(["Branch", "Status", "Add employee"]);
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

	it("given_noClearCallback_when_rendered_then_offersNoClearFilters", () => {
		render(
			<PageToolbar
				filters={<button type="button">Status</button>}
				label="People list controls"
			/>
		);

		expect(
			screen.queryByRole("button", { name: "Clear filters" })
		).not.toBeInTheDocument();
	});

	it("given_aClearCallback_when_clearFiltersIsClicked_then_asksToClear", async () => {
		const user = userEvent.setup();
		const onClearFilters = vi.fn();
		render(
			<PageToolbar
				filters={<button type="button">Status</button>}
				label="People list controls"
				onClearFilters={onClearFilters}
			/>
		);

		await user.click(screen.getByRole("button", { name: "Clear filters" }));

		expect(onClearFilters).toHaveBeenCalledOnce();
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
