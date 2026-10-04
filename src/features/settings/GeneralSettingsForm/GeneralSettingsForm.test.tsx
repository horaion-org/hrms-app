import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { expect, it } from "vitest";
import { authTestI18n } from "@/features/auth/testingI18n";
import { GeneralSettingsForm } from "@/features/settings/GeneralSettingsForm";
import type { GeneralSettingsValues } from "@/features/settings/schemas";

const loaded: GeneralSettingsValues = {
	workspaceName: "Horaion",
	defaultLanguage: "en",
	timeZone: "Asia/Singapore",
	dateFormat: "DD MM YYYY",
	country: "SG",
};

const renderForm = (defaultValues = loaded): void => {
	render(
		<I18nextProvider i18n={authTestI18n}>
			<GeneralSettingsForm defaultValues={defaultValues} />
		</I18nextProvider>
	);
};

const workspaceName = (): HTMLElement =>
	screen.getByRole("textbox", { name: "Workspace Name" });

it("prefills every field from the loaded settings with labelled controls", () => {
	renderForm();
	expect(workspaceName()).toHaveValue("Horaion");
	for (const [name, value] of [
		["Default Language", "English"],
		["Time Zone", "Singapore (GMT +8)"],
		["Date Format", "DD MM YYYY"],
		["Country", "Singapore"],
	] as const) {
		expect(screen.getByRole("button", { name })).toHaveTextContent(value);
	}
});

it("offers the three date formats in the design's order", async () => {
	const user = userEvent.setup();
	renderForm();
	await user.click(screen.getByRole("button", { name: "Date Format" }));
	expect(
		within(screen.getByRole("listbox"))
			.getAllByRole("option")
			.map((option) => option.textContent)
	).toEqual(["DD MM YYYY", "MM DD YYYY", "YYYY MM DD"]);
});

it("keeps Save Changes disabled and says why", async () => {
	const user = userEvent.setup();
	renderForm();
	const save = screen.getByRole("button", { name: "Save Changes" });
	expect(save).toBeDisabled();
	expect(save).toHaveAttribute("type", "submit");
	expect(save).toHaveAccessibleDescription(
		"Saving settings isn’t available yet."
	);
	await user.clear(workspaceName());
	await user.type(workspaceName(), "Renamed{Enter}");
	expect(save).toBeDisabled();
	expect(workspaceName()).toHaveValue("Renamed");
});

it("returns every edited field to its loaded value on Cancel and clears errors", async () => {
	const user = userEvent.setup();
	renderForm();
	await user.clear(workspaceName());
	await user.tab();
	expect(await screen.findByRole("alert")).toHaveTextContent(
		"Enter a workspace name."
	);
	await user.click(screen.getByRole("button", { name: "Date Format" }));
	await user.click(screen.getByRole("option", { name: "YYYY MM DD" }));
	expect(screen.getByRole("button", { name: "Date Format" })).toHaveTextContent(
		"YYYY MM DD"
	);

	const cancel = screen.getByRole("button", { name: "Cancel" });
	expect(cancel).toHaveAttribute("type", "button");
	await user.click(cancel);

	expect(workspaceName()).toHaveValue("Horaion");
	expect(screen.getByRole("button", { name: "Date Format" })).toHaveTextContent(
		"DD MM YYYY"
	);
	expect(screen.queryByRole("alert")).not.toBeInTheDocument();
	expect(workspaceName()).not.toHaveAttribute("aria-invalid");
});

it("requires a workspace name once the field is left, ignoring surrounding spaces", async () => {
	const user = userEvent.setup();
	renderForm();
	await user.clear(workspaceName());
	await user.type(workspaceName(), "   ");
	expect(screen.queryByRole("alert")).not.toBeInTheDocument();
	await user.tab();
	const alert = await screen.findByRole("alert");
	expect(alert).toHaveTextContent("Enter a workspace name.");
	expect(workspaceName()).toHaveAttribute("aria-invalid", "true");
	expect(workspaceName()).toHaveAccessibleDescription(
		"Enter a workspace name."
	);
	await user.type(workspaceName(), "Acme");
	expect(screen.queryByRole("alert")).not.toBeInTheDocument();
	expect(workspaceName()).not.toHaveAccessibleDescription();
});

it("limits the workspace name to 255 characters", async () => {
	const user = userEvent.setup();
	renderForm({ ...loaded, workspaceName: "a".repeat(255) });
	await user.click(workspaceName());
	await user.tab();
	expect(screen.queryByRole("alert")).not.toBeInTheDocument();
	await user.type(workspaceName(), "b");
	expect(await screen.findByRole("alert")).toHaveTextContent(
		"Use at most 255 characters."
	);
});
