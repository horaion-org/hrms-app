import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { ComboboxSearch } from "@/components/forms/Combobox/ComboboxSearch";
it("links the search to the actual listbox rather than its presentation panel", () => {
	render(
		<ComboboxSearch
			aria-controls="panel"
			aria-label="Search people"
			listId="choices"
		/>
	);
	expect(
		screen.getByRole("textbox", { name: "Search people" })
	).toHaveAttribute("aria-controls", "choices");
});
