import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { expect, it } from "vitest";
import { FormRow, formRowIds } from "@/components/forms/FormRow";
import { Input } from "@/components/forms/Input";
import { Select } from "@/components/forms/Select";

it("labels its native control through htmlFor and focuses it from the label", async () => {
	const user = userEvent.setup();
	render(
		<FormRow htmlFor="workspace-name" label="Workspace Name">
			<Input defaultValue="Horaion" id="workspace-name" />
		</FormRow>
	);
	const input = screen.getByRole("textbox", { name: "Workspace Name" });
	expect(input).toHaveValue("Horaion");
	await user.click(screen.getByText("Workspace Name"));
	expect(input).toHaveFocus();
	expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});

it("names a Select through the label id that formRowIds gives", () => {
	const { labelId } = formRowIds("date-format");
	render(
		<FormRow htmlFor="date-format" label="Date Format">
			<Select
				aria-labelledby={labelId}
				defaultValue="dmy"
				options={[{ value: "dmy", label: "DD MM YYYY" }]}
			/>
		</FormRow>
	);
	expect(screen.getByRole("button", { name: "Date Format" })).toHaveTextContent(
		"DD MM YYYY"
	);
	expect(screen.getByText("Date Format")).toHaveAttribute("id", labelId);
});

it("announces an error under the field with the id the control describes itself by", () => {
	const { errorId } = formRowIds("workspace-name");
	const { rerender } = render(
		<FormRow
			error="This field is required."
			htmlFor="workspace-name"
			label="Workspace Name"
		>
			<Input aria-describedby={errorId} id="workspace-name" status="error" />
		</FormRow>
	);
	const alert = screen.getByRole("alert");
	expect(alert).toHaveTextContent("This field is required.");
	expect(alert).toHaveAttribute("id", "workspace-name-error");
	expect(
		screen.getByRole("textbox", { name: "Workspace Name" })
	).toHaveAccessibleDescription("This field is required.");
	expect(screen.getByRole("textbox")).toBeInvalid();
	rerender(
		<FormRow error="" htmlFor="workspace-name" label="Workspace Name">
			<Input id="workspace-name" />
		</FormRow>
	);
	expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});

it("lays the label left of a fixed field column that stacks below sm and passes row props through", () => {
	const ref = createRef<HTMLDivElement>();
	render(
		<FormRow
			ref={ref}
			className="settings-row"
			data-testid="row"
			htmlFor="country"
			label="Country"
		>
			<Input id="country" />
		</FormRow>
	);
	const row = screen.getByTestId("row");
	expect(ref.current).toBe(row);
	expect(row).toHaveClass(
		"settings-row",
		"flex-col",
		"sm:flex-row",
		"sm:items-center",
		"sm:justify-between"
	);
	expect(screen.getByText("Country")).toHaveClass(
		"text-base",
		"font-bold",
		"text-neutral-800"
	);
	expect(screen.getByRole("textbox").parentElement?.parentElement).toHaveClass(
		"w-full",
		"sm:w-95"
	);
});
