import { waitFor, within } from "@testing-library/react";
import type userEvent from "@testing-library/user-event";
import { expect } from "vitest";

/*
 * For tests that publish through the checked publish dialog
 * (`CheckedPublishDialog`); never part of the app.
 */

/**
 * Presses the confirm button named `name` in a checked publish dialog once
 * the rules check has let it go: the button is held back while the check runs.
 */
export const confirmOnceChecked = async (
	user: ReturnType<typeof userEvent.setup>,
	dialog: HTMLElement,
	name: string
): Promise<void> => {
	const confirm = within(dialog).getByRole("button", { name });
	await waitFor(() => {
		expect(confirm).toBeEnabled();
	});
	await user.click(confirm);
};
