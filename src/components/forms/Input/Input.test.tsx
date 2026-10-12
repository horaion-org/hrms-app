import { render, renderHook, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { useForm } from "react-hook-form";
import { describe, expect, it, vi } from "vitest";
import { Input } from "@/components/forms/Input";
import { Button } from "@/components/ui/Button";
import { SearchIcon, ViewIcon } from "@/components/ui/Icon";

/* The disabled look follows the native input's state through `:has()`. */
const disabledLook = [
	"has-[>input:disabled]:cursor-not-allowed",
	"has-[>input:disabled]:border-neutral-400",
	"has-[>input:disabled]:bg-neutral-200",
	"has-[>input:disabled]:text-neutral-500",
	"has-[>input:disabled]:outline-none",
	"has-[>input:disabled]:[&_svg]:text-neutral-500",
];

describe("Input", () => {
	it.each([undefined, null, false, true, "", [], <></>])(
		"leaves no slot elements or gaps for empty React nodes (%s)",
		(empty) => {
			render(<Input leadingIcon={empty} trailingIcon={empty} />);
			const input = screen.getByRole("textbox");
			expect(input.parentElement?.childNodes).toHaveLength(1);
			expect(input.parentElement?.firstChild).toBe(input);
		}
	);

	it("preserves zero and text nodes in either slot", () => {
		const { rerender } = render(<Input leadingIcon={0} trailingIcon="items" />);
		const input = screen.getByRole("textbox");
		expect(input.previousSibling).toHaveTextContent("0");
		expect(input.nextSibling).toHaveTextContent("items");
		rerender(<Input leadingIcon="items" trailingIcon={0} />);
		expect(input.previousSibling).toHaveTextContent("items");
		expect(input.nextSibling).toHaveTextContent("0");
	});

	it("keeps decorative icons hidden and a trailing control named and keyboard-operable", async () => {
		const user = userEvent.setup();
		const ref = createRef<HTMLInputElement>();
		render(
			<Input
				ref={ref}
				aria-label="Password"
				leadingIcon={<SearchIcon data-testid="decoration" />}
				trailingIcon={
					<Button
						aria-label="Focus password"
						variant="textlink"
						onClick={() => ref.current?.focus()}
					>
						<ViewIcon />
					</Button>
				}
			/>
		);
		expect(screen.getByTestId("decoration")).toHaveAttribute(
			"aria-hidden",
			"true"
		);
		expect(screen.queryByRole("img")).not.toBeInTheDocument();
		await user.tab();
		expect(screen.getByRole("textbox", { name: "Password" })).toHaveFocus();
		await user.tab();
		expect(
			screen.getByRole("button", { name: "Focus password" })
		).toHaveFocus();
		await user.keyboard("{Enter}");
		expect(screen.getByRole("textbox", { name: "Password" })).toHaveFocus();
	});

	it("renders leading and trailing icons in order around the native input", () => {
		render(
			<Input
				leadingIcon={<SearchIcon data-testid="leading" />}
				trailingIcon={<ViewIcon data-testid="trailing" />}
			/>
		);
		const input = screen.getByRole("textbox");
		expect(input.previousSibling).toBe(screen.getByTestId("leading"));
		expect(input.nextSibling).toBe(screen.getByTestId("trailing"));
		expect(input).not.toHaveAttribute("leadingIcon");
		expect(input).not.toHaveAttribute("trailingIcon");
	});

	it("sizes real icons to 20px without shrinking and uses the field's Neutral colours", () => {
		render(<Input leadingIcon={<SearchIcon />} trailingIcon={<ViewIcon />} />);
		const box = screen.getByRole("textbox").parentElement;
		expect(box).toHaveClass(
			"[&_svg]:size-5",
			"[&_svg]:shrink-0",
			"[&>:not(input)]:shrink-0",
			"text-neutral-900",
			"[&_svg]:text-neutral-900",
			"has-[>input:disabled]:[&_svg]:text-neutral-500"
		);
	});

	it.each([false, true])(
		"colours a nested textlink Button icon with Input's Neutral shade (disabled=%s)",
		(disabled) => {
			render(
				<Input
					disabled={disabled}
					trailingIcon={
						<Button aria-label="View password" variant="textlink">
							<ViewIcon data-testid="view-icon" />
						</Button>
					}
				/>
			);
			const box = screen.getByRole("textbox").parentElement;
			expect(
				screen.getByRole("button", { name: "View password" })
			).toContainElement(screen.getByTestId("view-icon"));
			expect(box).toHaveClass(
				"[&_svg]:text-neutral-900",
				"has-[>input:disabled]:[&_svg]:text-neutral-500"
			);
		}
	);

	it.each([true, false, "true", "false", "grammar", "spelling"] as const)(
		"preserves explicit aria-invalid=%s across status and disabled changes",
		(ariaInvalid) => {
			const { rerender } = render(
				<Input aria-invalid={ariaInvalid} status="error" />
			);
			const input = screen.getByRole("textbox");

			expect(input).toHaveAttribute("aria-invalid", String(ariaInvalid));
			rerender(<Input disabled aria-invalid={ariaInvalid} status="error" />);
			expect(input).toHaveAttribute("aria-invalid", String(ariaInvalid));
			rerender(<Input aria-invalid={ariaInvalid} status="success" />);
			expect(input).toHaveAttribute("aria-invalid", String(ariaInvalid));
			rerender(<Input aria-invalid={ariaInvalid} />);
			expect(input).toHaveAttribute("aria-invalid", String(ariaInvalid));
		}
	);

	it("defaults an undefined aria-invalid to the Error status", () => {
		render(<Input aria-invalid={undefined} status="error" />);

		expect(screen.getByRole("textbox")).toHaveAttribute("aria-invalid", "true");
	});

	it.each(["success", "error"] as const)(
		"disables a field with %s status without losing its invalid meaning",
		async (status) => {
			const user = userEvent.setup();
			render(<Input disabled defaultValue="Ada" status={status} />);
			const input = screen.getByRole("textbox");

			expect(input).toBeDisabled();
			await user.type(input, " changed");
			await user.tab();
			expect(input).toHaveValue("Ada");
			expect(input).not.toHaveFocus();
			expect(input.parentElement).toHaveClass(...disabledLook);
			if (status === "error") {
				expect(input).toHaveAttribute("aria-invalid", "true");
			} else {
				expect(input).not.toHaveAttribute("aria-invalid");
			}
		}
	);

	it.each([undefined, "success", "error"] as const)(
		"styles a field disabled by a fieldset like one disabled by its prop (status=%s)",
		(status) => {
			render(
				<>
					<Input disabled aria-label="By prop" status={status} />
					<fieldset disabled>
						<Input aria-label="By fieldset" status={status} />
					</fieldset>
				</>
			);
			const byProp = screen.getByRole("textbox", { name: "By prop" });
			const byFieldset = screen.getByRole("textbox", { name: "By fieldset" });

			expect(byFieldset).toBeDisabled();
			expect(byFieldset.parentElement?.className).toBe(
				byProp.parentElement?.className
			);
		}
	);

	it("adds an Ink Blue focus ring only to fields with a status", () => {
		const ring = [
			"focus-within:outline-2",
			"focus-within:outline-offset-2",
			"focus-within:outline-ink-blue-500",
		];
		const { rerender } = render(<Input status="success" />);
		const box = screen.getByRole("textbox").parentElement;

		expect(box).toHaveClass(...ring);
		rerender(<Input status="error" />);
		expect(box).toHaveClass(...ring);
		rerender(<Input />);
		for (const className of ring) {
			expect(box).not.toHaveClass(className);
		}
	});

	it("marks only Error invalid and updates when status changes", () => {
		const { rerender } = render(<Input status="error" />);
		const input = screen.getByRole("textbox");

		expect(input).toHaveAttribute("aria-invalid", "true");
		rerender(<Input status="success" />);
		expect(input).not.toHaveAttribute("aria-invalid");
		rerender(<Input />);
		expect(input).not.toHaveAttribute("aria-invalid");
		expect(input.parentElement).toHaveClass(
			"border-neutral-400",
			"focus-within:border-ink-blue-900"
		);
	});

	it.each([
		["success", "border-success-600"],
		["error", "border-error-600"],
	] as const)(
		"keeps the %s border during keyboard and mouse focus",
		async (status, border) => {
			const user = userEvent.setup();
			render(<Input status={status} />);
			const input = screen.getByRole("textbox");

			expect(input.parentElement).toHaveClass(
				border,
				"bg-white",
				"text-neutral-900"
			);
			expect(input.parentElement).not.toHaveClass("border-neutral-400");
			expect(input).not.toHaveAttribute("status");
			await user.tab();
			expect(input).toHaveFocus();
			expect(input.parentElement).toHaveClass(border);
			expect(input.parentElement).not.toHaveClass(
				"focus-within:border-ink-blue-900"
			);
			await user.tab();
			await user.click(input);
			expect(input).toHaveFocus();
			expect(input.parentElement).toHaveClass(border);
		}
	);

	it("works with React Hook Form register for values, blur and focus", async () => {
		const user = userEvent.setup();
		const { result } = renderHook(() =>
			useForm({ defaultValues: { name: "Ada" } })
		);
		render(<Input aria-label="Name" {...result.current.register("name")} />);
		const input = screen.getByRole("textbox", { name: "Name" });

		expect(input).toHaveValue("Ada");
		await user.clear(input);
		await user.type(input, "Grace");
		await user.tab();
		expect(result.current.getValues("name")).toBe("Grace");
		expect(result.current.getFieldState("name").isTouched).toBe(true);
		result.current.setFocus("name");
		await waitFor(() => {
			expect(input).toHaveFocus();
		});
	});

	it("supports controlled values and delivers native change, focus and blur events", async () => {
		const user = userEvent.setup();
		const onChange = vi.fn();
		const onFocus = vi.fn();
		const onBlur = vi.fn();
		const { rerender } = render(
			<Input
				value="Ada"
				onBlur={onBlur}
				onChange={onChange}
				onFocus={onFocus}
			/>
		);
		const input = screen.getByRole("textbox");

		await user.click(input);
		expect(onFocus).toHaveBeenCalledWith(
			expect.objectContaining({ target: input, type: "focus" })
		);
		await user.type(input, "!");
		expect(onChange).toHaveBeenCalledWith(
			expect.objectContaining({ target: input, type: "change" })
		);
		expect(input).toHaveValue("Ada");
		await user.tab();
		expect(onBlur).toHaveBeenCalledWith(
			expect.objectContaining({ target: input, type: "blur" })
		);
		rerender(<Input value="Grace" onChange={onChange} />);
		expect(input).toHaveValue("Grace");
	});

	it("exposes the native input through ref for programmatic focus", () => {
		const ref = createRef<HTMLInputElement>();
		render(<Input ref={ref} aria-label="Name" />);

		expect(ref.current).toBe(screen.getByRole("textbox", { name: "Name" }));
		ref.current?.focus();
		expect(screen.getByRole("textbox", { name: "Name" })).toHaveFocus();
	});

	it("renders a textbox that accepts typing", async () => {
		const user = userEvent.setup();
		render(<Input />);

		const input = screen.getByRole("textbox");
		await user.type(input, "Vernon");

		expect(input).toHaveValue("Vernon");
	});

	it("passes native attributes and defaultValue to the input", async () => {
		const user = userEvent.setup();
		render(
			<Input
				aria-describedby="email-hint"
				aria-label="Email"
				autoComplete="email"
				defaultValue="hi"
				id="email"
				maxLength={5}
				name="email"
				placeholder="Your email"
				type="email"
			/>
		);

		const input = screen.getByRole("textbox", { name: "Email" });
		expect(input).toHaveValue("hi");
		expect(input).toHaveAttribute("type", "email");
		expect(input).toHaveAttribute("name", "email");
		expect(input).toHaveAttribute("id", "email");
		expect(input).toHaveAttribute("placeholder", "Your email");
		expect(input).toHaveAttribute("autocomplete", "email");
		expect(input).toHaveAttribute("aria-describedby", "email-hint");
		await user.type(input, "abcdef");
		expect(input).toHaveValue("hiabc");
	});

	it("draws the neutral box and places a custom className on it", () => {
		render(<Input className="w-full" />);

		const input = screen.getByRole("textbox");
		expect(input.parentElement).toHaveClass(
			"w-full",
			"h-11",
			"px-4",
			"gap-3",
			"rounded-lg",
			"border",
			"border-neutral-400",
			"bg-white",
			"text-sm",
			"text-neutral-900"
		);
		expect(input).not.toHaveClass("w-full");
		expect(input).toHaveClass(
			"min-w-0",
			"flex-1",
			"border-0",
			"outline-hidden",
			"bg-transparent",
			"placeholder:text-neutral-500"
		);
	});

	it("uses an Ink Blue focus-within border for mouse and keyboard focus", async () => {
		const user = userEvent.setup();
		render(<Input />);
		const input = screen.getByRole("textbox");

		await user.tab();
		expect(input).toHaveFocus();
		expect(input.parentElement).toHaveClass("focus-within:border-ink-blue-900");
		await user.tab();
		expect(input).not.toHaveFocus();
		await user.click(input);
		expect(input).toHaveFocus();
	});

	it("disables editing, skips keyboard focus and uses the disabled Neutral look", async () => {
		const user = userEvent.setup();
		render(
			<>
				<Input disabled aria-label="Unavailable" defaultValue="Vernon" />
				<Input aria-label="Available" />
			</>
		);
		const input = screen.getByRole("textbox", { name: "Unavailable" });

		expect(input).toBeDisabled();
		await user.type(input, " changed");
		expect(input).toHaveValue("Vernon");
		await user.tab();
		expect(screen.getByRole("textbox", { name: "Available" })).toHaveFocus();
		expect(input.parentElement).toHaveClass(...disabledLook);
		expect(input).toHaveClass("disabled:cursor-not-allowed");
	});

	it("given_theLargeSize_when_rendered_then_matchesALargeButtonsHeight", () => {
		render(<Input aria-label="Search" inputSize="lg" type="search" />);

		const field = screen.getByRole("searchbox", {
			name: "Search",
		}).parentElement;
		expect(field).toHaveClass("h-14");
		expect(field).not.toHaveClass("h-11");
	});
});
