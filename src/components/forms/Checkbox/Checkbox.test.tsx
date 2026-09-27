import { composeStories } from "@storybook/react-vite";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Checkbox } from "@/components/forms/Checkbox";
import * as stories from "@/components/forms/Checkbox/Checkbox.stories";

describe("Checkbox", () => {
	it("toggles when its label is clicked", async () => {
		const onChange = vi.fn();
		render(<Checkbox label="Remember me" onChange={onChange} />);

		const checkbox = screen.getByRole("checkbox", { name: "Remember me" });
		expect(checkbox).not.toBeChecked();

		await userEvent.click(screen.getByText("Remember me"));

		expect(checkbox).toBeChecked();
		expect(onChange).toHaveBeenCalledOnce();
	});

	it("toggles from the keyboard", async () => {
		const user = userEvent.setup();
		render(<Checkbox defaultChecked label="Remember me" />);

		await user.tab();
		await user.keyboard(" ");

		expect(
			screen.getByRole("checkbox", { name: "Remember me" })
		).not.toBeChecked();
	});

	it("keeps a caller-supplied id on the input", () => {
		render(<Checkbox id="remember" label="Remember me" />);

		expect(
			screen.getByRole("checkbox", { name: "Remember me" })
		).toHaveAttribute("id", "remember");
	});

	it("does not toggle when disabled", async () => {
		render(<Checkbox disabled label="Remember me" />);

		await userEvent.click(screen.getByText("Remember me"));

		expect(
			screen.getByRole("checkbox", { name: "Remember me" })
		).not.toBeChecked();
	});

	it("merges a custom className onto the row", () => {
		const { container } = render(
			<Checkbox className="mt-2" label="Remember me" />
		);

		expect(container.firstChild).toHaveClass("flex", "mt-2");
	});
});

describe("Checkbox stories", () => {
	const { Unchecked, Checked, Disabled } = composeStories(stories);

	it.each([
		{ Story: Unchecked, checked: false, disabled: false },
		{ Story: Checked, checked: true, disabled: false },
		{ Story: Disabled, checked: false, disabled: true },
	])("renders $Story.storyName", ({ Story, checked, disabled }) => {
		render(<Story />);

		const checkbox = screen.getByRole("checkbox", { name: "Remember me" });
		expect((checkbox as HTMLInputElement).checked).toBe(checked);
		expect((checkbox as HTMLInputElement).disabled).toBe(disabled);
	});
});
