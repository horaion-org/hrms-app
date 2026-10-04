import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { ComboboxTrigger } from "@/components/forms/Combobox/ComboboxTrigger";
it("makes the closed trigger keyboard reachable and links its open popup", () => {
	const { rerender } = render(
		<ComboboxTrigger aria-expanded={false} listId="choices" tabIndex={-1}>
			Choose people
		</ComboboxTrigger>
	);
	const trigger = screen.getByRole("button", { name: "Choose people" });
	expect(trigger).toHaveAttribute("tabindex", "0");
	expect(trigger).not.toHaveAttribute("aria-controls");
	rerender(
		<ComboboxTrigger aria-expanded listId="choices">
			Choose people
		</ComboboxTrigger>
	);
	expect(trigger).toHaveAttribute("aria-controls", "choices");
});
