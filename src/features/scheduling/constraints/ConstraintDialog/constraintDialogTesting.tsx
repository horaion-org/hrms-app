import { render, screen } from "@testing-library/react";
import type userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { vi } from "vitest";
import { authTestI18n } from "@/features/auth/testingI18n";
import { ConstraintDialog } from "@/features/scheduling/constraints/ConstraintDialog";
import { CONSTRAINT_OPTIONS } from "@/features/scheduling/constraints/fixtures";
import type { ConstraintOptionsState } from "@/features/scheduling/constraints/useConstraintOptions";

/*
 * What the constraint dialog's tests share: the dialog rendered with ready
 * options, and the steps a manager takes in it.
 */

/** The constraint options loaded, as the dialog is usually given them. */
export const readyOptions: ConstraintOptionsState = {
	status: "ready",
	options: CONSTRAINT_OPTIONS,
};

/** Renders the dialog with ready options and the given props, returning its save and close spies. */
export const renderDialog = (
	props: Partial<Parameters<typeof ConstraintDialog>[0]> = {}
): { onSave: ReturnType<typeof vi.fn>; onClose: ReturnType<typeof vi.fn> } => {
	const onSave = vi.fn().mockResolvedValue(undefined);
	const onClose = vi.fn();
	render(
		<I18nextProvider i18n={authTestI18n}>
			<ConstraintDialog
				options={readyOptions}
				onClose={onClose}
				onSave={onSave}
				{...props}
			/>
		</I18nextProvider>
	);
	return { onSave, onClose };
};

/** A select's trigger button, found by its label. */
export const trigger = (name: RegExp): HTMLElement =>
	screen.getByRole("button", { name });

/** Opens a select and picks each option, closing it again. */
export const pick = async (
	user: ReturnType<typeof userEvent.setup>,
	name: RegExp,
	...labels: Array<string>
): Promise<void> => {
	await user.click(trigger(name));
	await labels.reduce(
		(previous, label) =>
			previous.then(async () => {
				await user.click(await screen.findByRole("option", { name: label }));
			}),
		Promise.resolve()
	);
	if (screen.queryByRole("listbox")) await user.keyboard("{Escape}");
};

/** Chooses what the constraint decides on the chooser, then goes on to the form. */
export const chooseType = async (
	user: ReturnType<typeof userEvent.setup>,
	label: string
): Promise<void> => {
	await user.click(await screen.findByRole("radio", { name: label }));
	await user.click(screen.getByRole("button", { name: "Continue" }));
};

/** The button that sends the form: Add constraint for a new one, Save for an edit. */
export const submitButton = (): HTMLElement =>
	screen.getByRole("button", { name: /^(Save|Add constraint)$/ });

/** The link back to the chooser, offered while the kind may change. */
export const changeTypeLink = (): HTMLElement | null =>
	screen.queryByRole("button", { name: /^Change what it decides/ });

/** The constraint's name field. */
export const nameField = (): HTMLElement =>
	screen.getByRole("textbox", { name: /^Name/ });

/** Replaces the name, suggested or not, with one typed in. */
export const typeName = async (
	user: ReturnType<typeof userEvent.setup>,
	name: string
): Promise<void> => {
	await user.clear(nameField());
	await user.type(nameField(), name);
};

/** Names the constraint and chooses its type, as every new constraint starts. */
export const start = async (
	user: ReturnType<typeof userEvent.setup>,
	type: string
): Promise<void> => {
	await screen.findByRole("dialog", { name: "Add constraint" });
	await chooseType(user, type);
	await typeName(user, "Morning cover");
};
