import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { ComboboxPanel } from "@/components/forms/Combobox/ComboboxPanel";
it("keeps search outside listbox semantics and forwards development instrumentation", () => {
	render(
		<ComboboxPanel data-tsd-source="example.tsx" role="listbox">
			<input aria-label="Search people" />
			<div aria-label="People" role="listbox" />
		</ComboboxPanel>
	);
	expect(screen.getAllByRole("listbox")).toHaveLength(1);
	expect(screen.getByRole("presentation")).toHaveAttribute(
		"data-tsd-source",
		"example.tsx"
	);
});
