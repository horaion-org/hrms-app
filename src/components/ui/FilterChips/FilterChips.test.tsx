import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import { beforeAll, describe, expect, it, vi } from "vitest";
import en from "@/assets/locales/en/translations.json";
import { FilterChips } from "@/components/ui/FilterChips";

beforeAll(async () => {
	await createInstance()
		.use(initReactI18next)
		.init({ lng: "en", resources: { en: { translation: en } } });
});

describe("FilterChips", () => {
	it("given_noFilterSet_when_rendered_then_rendersNothing", () => {
		const { container } = render(
			<FilterChips chips={[]} onClearAll={vi.fn()} />
		);

		expect(container).toBeEmptyDOMElement();
	});

	it("given_filtersSet_when_rendered_then_listsEachAsAChipWithClearFilters", () => {
		render(
			<FilterChips
				chips={[
					{
						key: "department",
						label: "Department: Kitchen",
						onRemove: vi.fn(),
					},
					{ key: "status", label: "Showing: Active", onRemove: vi.fn() },
				]}
				onClearAll={vi.fn()}
			/>
		);

		const list = screen.getByRole("list", { name: "Active filters" });
		expect(
			within(list)
				.getAllByRole("listitem")
				.map((item) => item.textContent)
		).toEqual(["Department: Kitchen", "Showing: Active"]);
		expect(screen.getByRole("button", { name: "Clear filters" })).toBeVisible();
	});

	it("given_aChip_when_itsRemoveButtonIsClicked_then_removesOnlyThatFilter", async () => {
		const user = userEvent.setup();
		const removeDepartment = vi.fn();
		const removeStatus = vi.fn();
		const onClearAll = vi.fn();
		render(
			<FilterChips
				chips={[
					{
						key: "department",
						label: "Department: Kitchen",
						onRemove: removeDepartment,
					},
					{ key: "status", label: "Showing: Active", onRemove: removeStatus },
				]}
				onClearAll={onClearAll}
			/>
		);

		await user.click(
			screen.getByRole("button", { name: "Remove Department: Kitchen" })
		);
		await user.click(screen.getByRole("button", { name: "Clear filters" }));

		expect(removeDepartment).toHaveBeenCalledOnce();
		expect(removeStatus).not.toHaveBeenCalled();
		expect(onClearAll).toHaveBeenCalledOnce();
	});
});
