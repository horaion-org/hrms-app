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
	expect(alert.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
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

it("describes a field with its helper without reading out the visual counter", () => {
	const { hintId } = formRowIds("branch-name");
	render(
		<FormRow
			counter="0/100"
			hint="Use 2 to 100 characters."
			htmlFor="branch-name"
			label="Branch name"
		>
			<Input aria-describedby={hintId} id="branch-name" maxLength={100} />
		</FormRow>
	);
	expect(
		screen.getByRole("textbox", { name: "Branch name" })
	).toHaveAccessibleDescription("Use 2 to 100 characters.");
	expect(screen.getByText("0/100")).toBeVisible();
	expect(screen.getByText("0/100")).toHaveAttribute("aria-hidden", "true");
});

it("replaces the helper with an announced error, keeps the counter and restores the helper after correction", () => {
	const { hintId, errorId } = formRowIds("branch-heads");
	const { rerender } = render(
		<FormRow
			counter="0/20"
			hint="Choose 1 to 20 heads."
			htmlFor="branch-heads"
			label="Branch heads"
		>
			<Input aria-describedby={hintId} id="branch-heads" />
		</FormRow>
	);
	expect(screen.getByRole("textbox")).toHaveAccessibleDescription(
		"Choose 1 to 20 heads."
	);
	rerender(
		<FormRow
			counter="0/20"
			error="Choose at least one head."
			hint="Choose 1 to 20 heads."
			htmlFor="branch-heads"
			label="Branch heads"
		>
			<Input aria-describedby={errorId} id="branch-heads" status="error" />
		</FormRow>
	);
	expect(screen.queryByText("Choose 1 to 20 heads.")).not.toBeInTheDocument();
	expect(screen.getByRole("alert")).toHaveTextContent(
		"Choose at least one head."
	);
	expect(screen.getByRole("textbox")).toHaveAccessibleDescription(
		"Choose at least one head."
	);
	expect(screen.getByRole("textbox")).toBeInvalid();
	expect(screen.getByText("0/20")).toBeVisible();
	rerender(
		<FormRow
			counter="1/20"
			error=""
			hint="Choose 1 to 20 heads."
			htmlFor="branch-heads"
			label="Branch heads"
		>
			<Input aria-describedby={hintId} id="branch-heads" />
		</FormRow>
	);
	expect(screen.queryByRole("alert")).not.toBeInTheDocument();
	expect(screen.getByRole("textbox")).toHaveAccessibleDescription(
		"Choose 1 to 20 heads."
	);
	expect(screen.getByText("1/20")).toBeVisible();
});

it("keeps a required stacked field full width without adding the asterisk to its accessible name", () => {
	render(
		<FormRow
			required
			data-testid="stacked-row"
			htmlFor="branch-name"
			label="Branch name"
			layout="stacked"
		>
			<Input required id="branch-name" />
		</FormRow>
	);
	const input = screen.getByRole("textbox", { name: "Branch name" });
	expect(input).toBeRequired();
	expect(screen.getByText("Branch name")).toHaveClass("text-sm");
	expect(screen.getByText("*")).toHaveAttribute("aria-hidden", "true");
	expect(screen.getByTestId("stacked-row")).toHaveClass("flex-col");
	expect(screen.getByTestId("stacked-row")).not.toHaveClass("sm:flex-row");
	expect(input.parentElement?.parentElement).not.toHaveClass("sm:w-95");
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
	const fieldColumn = screen.getByRole("textbox").parentElement?.parentElement;
	expect(fieldColumn).toHaveClass("w-full", "sm:w-95");
	expect(fieldColumn?.childElementCount).toBe(1);
});

it("lets the caller size the inline field column in place of the fixed 380px", () => {
	render(
		<FormRow
			fieldWidth="sm:w-1/2"
			htmlFor="probation"
			label="Probation end date"
		>
			<Input id="probation" />
		</FormRow>
	);
	const fieldColumn = screen.getByRole("textbox").parentElement?.parentElement;
	expect(fieldColumn).toHaveClass("w-full", "sm:w-1/2", "sm:shrink-0");
	expect(fieldColumn).not.toHaveClass("sm:w-95");
});
