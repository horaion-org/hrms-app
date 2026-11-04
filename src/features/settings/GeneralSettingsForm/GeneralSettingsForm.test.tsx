import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { expect, it, vi } from "vitest";
import { ApiProblemError } from "@/common/problem";
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

type Save = (workspaceName: string) => Promise<string>;

const renderForm = ({
	defaultValues = loaded,
	canRename = true,
	onSave = vi.fn<Save>((name) => Promise.resolve(name.trim())),
}: {
	defaultValues?: GeneralSettingsValues;
	canRename?: boolean;
	onSave?: Save;
} = {}): void => {
	render(
		<I18nextProvider i18n={authTestI18n}>
			<GeneralSettingsForm
				canRename={canRename}
				defaultValues={defaultValues}
				onSave={onSave}
			/>
		</I18nextProvider>
	);
};

const problem = (status: number, errorCode: string): ApiProblemError =>
	new ApiProblemError({
		message: "Refused",
		status,
		errorCode,
		fieldErrors: [],
		reason: status === 403 ? "forbidden" : "validation",
	});

const workspaceName = (): HTMLElement =>
	screen.getByRole("textbox", { name: "Workspace Name" });
const save = (): HTMLElement =>
	screen.getByRole("button", { name: "Save Changes" });

/** Replaces the workspace name and leaves the field, as a person would. */
const rename = async (name: string): Promise<void> => {
	const user = userEvent.setup();
	await user.clear(workspaceName());
	if (name) await user.type(workspaceName(), name);
	await user.tab();
};

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

it("keeps the preferences fixed and says so", () => {
	renderForm();
	for (const name of [
		"Default Language",
		"Time Zone",
		"Date Format",
		"Country",
	])
		expect(screen.getByRole("button", { name })).toBeDisabled();
	expect(
		screen.getByText(
			"Language, time zone, date format and country can’t be changed yet."
		)
	).toBeVisible();
});

it("enables Save Changes only once the workspace name changed", async () => {
	renderForm();
	expect(save()).toBeDisabled();
	expect(save()).toHaveAttribute("type", "submit");

	await rename("Acme");
	expect(save()).toBeEnabled();

	await rename("Horaion");
	expect(save()).toBeDisabled();
});

it("saves the trimmed name and shows the name as saved", async () => {
	const user = userEvent.setup();
	const onSave = vi.fn<Save>(() => Promise.resolve("Prospect Protection"));
	renderForm({ onSave });

	await rename("  Prospect   Protection ");
	await user.click(save());

	expect(onSave).toHaveBeenCalledExactlyOnceWith("Prospect   Protection");
	expect(workspaceName()).toHaveValue("Prospect Protection");
	expect(save()).toBeDisabled();
});

it("returns the name to its loaded value on Cancel and clears errors", async () => {
	const user = userEvent.setup();
	renderForm();
	await rename("");
	expect(await screen.findByRole("alert")).toHaveTextContent(
		"Enter a workspace name."
	);

	const cancel = screen.getByRole("button", { name: "Cancel" });
	expect(cancel).toHaveAttribute("type", "button");
	await user.click(cancel);

	expect(workspaceName()).toHaveValue("Horaion");
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

it.each([
	["A", "Use 2 to 100 characters."],
	["a".repeat(101), "Use 2 to 100 characters."],
	["Acme <Asia>", "Use only letters, numbers, spaces and . ' & - in the name."],
])("refuses %s before saving", async (name, message) => {
	const user = userEvent.setup();
	const onSave = vi.fn<Save>();
	renderForm({ onSave });

	await rename(name);
	await user.click(save());

	expect(await screen.findByRole("alert")).toHaveTextContent(message);
	expect(onSave).not.toHaveBeenCalled();
});

it("accepts 100 characters and the allowed punctuation", async () => {
	const user = userEvent.setup();
	const onSave = vi.fn<Save>((name) => Promise.resolve(name));
	renderForm({ onSave });

	await rename("Prospect Protection Pte. Ltd. & O'Neil-Co");
	await user.click(save());
	await rename("a".repeat(100));
	await user.click(save());

	expect(onSave).toHaveBeenCalledTimes(2);
	expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});

it("places the API's name refusal on the field", async () => {
	const user = userEvent.setup();
	renderForm({
		onSave: () => Promise.reject(problem(400, "INVALID_COMPANY_NAME")),
	});

	await rename("Acme");
	await user.click(save());

	expect(await screen.findByRole("alert")).toHaveTextContent(
		"Check the workspace name and try again."
	);
	expect(workspaceName()).toHaveAttribute("aria-invalid", "true");
});

it("explains a refusal of permission, and any other failure, under the form", async () => {
	const user = userEvent.setup();
	const onSave = vi
		.fn<Save>()
		.mockRejectedValueOnce(problem(403, "AUTHORIZATION_DENIED"))
		.mockRejectedValueOnce(new Error("offline"));
	renderForm({ onSave });

	await rename("Acme");
	await user.click(save());
	expect(await screen.findByRole("alert")).toHaveTextContent(
		"You no longer have permission to rename this workspace."
	);

	await user.click(save());
	expect(await screen.findByRole("alert")).toHaveTextContent(
		"We couldn’t save the workspace name. Please try again."
	);
});

it("shows the name read-only, with the reason, without permission to rename", () => {
	renderForm({ canRename: false });
	expect(workspaceName()).toBeDisabled();
	expect(workspaceName()).toHaveValue("Horaion");
	expect(
		screen.getByText(
			"Only people who can update the company can rename the workspace."
		)
	).toBeVisible();
	expect(
		screen.queryByRole("button", { name: "Save Changes" })
	).not.toBeInTheDocument();
	expect(
		screen.queryByRole("button", { name: "Cancel" })
	).not.toBeInTheDocument();
});
