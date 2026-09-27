import { composeStories } from "@storybook/react-vite";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FormField } from "@/components/forms/FormField";
import * as stories from "@/components/forms/FormField/FormField.stories";
import { Input } from "@/components/forms/Input";

describe("FormField", () => {
	it("labels its control", () => {
		render(
			<FormField label="Email">{(control) => <Input {...control} />}</FormField>
		);

		expect(screen.getByRole("textbox", { name: "Email" })).toBeInTheDocument();
	});

	it("describes the control with its hint", () => {
		render(
			<FormField hint="Lowercase letters only" label="Subdomain">
				{(control) => <Input {...control} />}
			</FormField>
		);

		const input = screen.getByRole("textbox", { name: "Subdomain" });
		expect(input).toHaveAccessibleDescription("Lowercase letters only");
		expect(input).not.toHaveAttribute("aria-invalid");
	});

	it("replaces the hint with the error and marks the control invalid", () => {
		render(
			<FormField
				error="Required"
				hint="Lowercase letters only"
				label="Subdomain"
			>
				{(control) => <Input {...control} />}
			</FormField>
		);

		const input = screen.getByRole("textbox", { name: "Subdomain" });
		expect(input).toHaveAccessibleDescription("Required");
		expect(input).toHaveAttribute("aria-invalid", "true");
		expect(
			screen.queryByText("Lowercase letters only")
		).not.toBeInTheDocument();
		expect(screen.getByText("Required")).toHaveClass("text-error-600");
	});

	it("leaves the control undescribed without a hint or error", () => {
		render(
			<FormField error="" label="Email">
				{(control) => <Input {...control} />}
			</FormField>
		);

		const input = screen.getByRole("textbox", { name: "Email" });
		expect(input).not.toHaveAttribute("aria-describedby");
		expect(input).not.toHaveAttribute("aria-invalid");
	});

	it("merges a custom className", () => {
		const { container } = render(
			<FormField className="col-span-2" label="Email">
				{(control) => <Input {...control} />}
			</FormField>
		);

		expect(container.firstChild).toHaveClass("flex", "col-span-2");
	});
});

describe("FormField stories", () => {
	const { Default, WithHint, WithError } = composeStories(stories);

	it.each([
		{ Story: Default, description: "" },
		{ Story: WithHint, description: "We send your confirmation code here." },
		{ Story: WithError, description: "Enter a valid email address" },
	])("renders $Story.storyName", ({ Story, description }) => {
		render(<Story />);

		expect(
			screen.getByRole("textbox", { name: "Email" })
		).toHaveAccessibleDescription(description);
	});
});
