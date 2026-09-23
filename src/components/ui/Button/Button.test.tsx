import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Button } from "./Button";

describe("Button", () => {
	it("renders its label as a button with type=button by default", () => {
		render(<Button>Save</Button>);

		const button = screen.getByRole("button", { name: "Save" });
		expect(button).toHaveAttribute("type", "button");
	});

	it("calls onClick when clicked", async () => {
		const onClick = vi.fn();
		render(<Button onClick={onClick}>Save</Button>);

		await userEvent.click(screen.getByRole("button", { name: "Save" }));

		expect(onClick).toHaveBeenCalledOnce();
	});

	it("does not call onClick when disabled", async () => {
		const onClick = vi.fn();
		render(
			<Button disabled onClick={onClick}>
				Save
			</Button>
		);

		await userEvent.click(screen.getByRole("button", { name: "Save" }));

		expect(onClick).not.toHaveBeenCalled();
	});

	it("renders leading and trailing icons around the label", () => {
		render(
			<Button
				leadingIcon={<span data-testid="leading" />}
				trailingIcon={<span data-testid="trailing" />}
			>
				Save
			</Button>
		);

		const button = screen.getByRole("button", { name: "Save" });
		expect(button.firstChild).toBe(screen.getByTestId("leading"));
		expect(button.lastChild).toBe(screen.getByTestId("trailing"));
	});

	it("applies pill sizing only to pill variants", () => {
		const { rerender } = render(<Button size="sm">Save</Button>);
		expect(screen.getByRole("button")).toHaveClass("rounded-full", "h-12");

		rerender(<Button variant="hyperlink">Save</Button>);
		expect(screen.getByRole("button")).not.toHaveClass("rounded-full");
		expect(screen.getByRole("button")).toHaveClass("underline");
	});

	it("merges a custom className", () => {
		render(<Button className="w-full">Save</Button>);

		expect(screen.getByRole("button")).toHaveClass("w-full");
	});
});
