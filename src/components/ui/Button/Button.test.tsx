import { render, screen } from "@testing-library/react";
import { composeStories } from "@storybook/react-vite";
import userEvent from "@testing-library/user-event";
import { describe, expect, expectTypeOf, it, vi } from "vitest";
import { Button, type ButtonProps } from "@/components/ui/Button";
import { ChevronLeftIcon } from "@/components/ui/Icon";
import * as stories from "@/components/ui/Button/Button.stories";

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

	it("shows a spinner, reports busy and blocks presses while loading", async () => {
		const onClick = vi.fn();
		render(
			<Button
				loading
				leadingIcon={<span data-testid="leading" />}
				onClick={onClick}
			>
				Save
			</Button>
		);

		const button = screen.getByRole("button", { name: "Save" });
		expect(button).toHaveAttribute("aria-busy", "true");
		expect(button).toBeDisabled();
		expect(screen.getByTestId("button-spinner")).toBeInTheDocument();
		expect(screen.queryByTestId("leading")).not.toBeInTheDocument();
		await userEvent.click(button);
		expect(onClick).not.toHaveBeenCalled();
	});

	it("is not busy by default", () => {
		render(<Button>Save</Button>);

		const button = screen.getByRole("button", { name: "Save" });
		expect(button).not.toHaveAttribute("aria-busy");
		expect(button).toBeEnabled();
		expect(screen.queryByTestId("button-spinner")).not.toBeInTheDocument();
	});

	it("merges a custom className", () => {
		render(<Button className="w-full">Save</Button>);

		expect(screen.getByRole("button")).toHaveClass("w-full");
	});
});

describe("Button icon variant", () => {
	it("supports an external accessible label and blocks clicks when disabled", async () => {
		const onClick = vi.fn();
		render(
			<>
				<span id="previous-month">Previous month</span>
				<Button
					disabled
					aria-labelledby="previous-month"
					variant="icon"
					onClick={onClick}
				>
					<ChevronLeftIcon />
				</Button>
			</>
		);

		const button = screen.getByRole("button", { name: "Previous month" });
		expect(button).toBeDisabled();
		expect(button).toHaveClass(
			"disabled:text-neutral-400",
			"disabled:cursor-not-allowed"
		);
		await userEvent.click(button);
		expect(onClick).not.toHaveBeenCalled();
	});

	it("requires an accessible name and rejects pill sizing and accessory icons", () => {
		expectTypeOf<{
			variant: "icon";
			"aria-label": string;
		}>().toExtend<ButtonProps>();
		expectTypeOf<{
			variant: "icon";
			"aria-labelledby": string;
		}>().toExtend<ButtonProps>();
		expectTypeOf<{
			variant: "icon";
			"aria-label": string;
			"aria-labelledby": string;
		}>().toExtend<ButtonProps>();
		expectTypeOf<{ variant: "icon" }>().not.toExtend<ButtonProps>();
		expectTypeOf<{
			variant: "icon";
			"aria-label": string;
			size: "sm";
		}>().not.toExtend<ButtonProps>();
		expectTypeOf<{
			variant: "icon";
			"aria-label": string;
			leadingIcon: string;
		}>().not.toExtend<ButtonProps>();
		expectTypeOf<{
			variant: "icon";
			"aria-label": string;
			trailingIcon: string;
		}>().not.toExtend<ButtonProps>();
		expectTypeOf<{
			variant: "icon";
			"aria-label": string;
			loading: true;
		}>().not.toExtend<ButtonProps>();
	});

	it("renders a named icon-only action with square transparent styling", async () => {
		const onClick = vi.fn();
		render(
			<Button
				aria-label="Previous month"
				className="custom-arrow"
				variant="icon"
				onClick={onClick}
			>
				<ChevronLeftIcon />
			</Button>
		);

		const button = screen.getByRole("button", { name: "Previous month" });
		expect(button).toHaveAttribute("type", "button");
		expect(button).toHaveClass(
			"size-9",
			"bg-transparent",
			"text-neutral-900",
			"enabled:hover:text-ink-blue-700",
			"enabled:active:text-ink-blue-500",
			"focus-visible:outline-ink-blue-500",
			"custom-arrow"
		);
		expect(button).not.toHaveClass("rounded-full", "px-6");
		await userEvent.click(button);
		expect(onClick).toHaveBeenCalledOnce();
	});
});

describe("Button stories", () => {
	const { Icon, IconDisabled } = composeStories(stories);

	it.each([
		{ Story: Icon, disabled: false },
		{ Story: IconDisabled, disabled: true },
	])(
		"renders the icon story with disabled=$disabled",
		({ Story, disabled }) => {
			render(<Story />);
			const button = screen.getByRole("button", { name: "Previous month" });
			expect(button).toHaveClass("size-9", "bg-transparent");
			expect(button.children).toHaveLength(1);
			if (disabled) {
				expect(button).toBeDisabled();
			} else {
				expect(button).toBeEnabled();
			}
		}
	);
});
