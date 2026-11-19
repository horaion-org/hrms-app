import { within } from "@testing-library/react";
import type userEvent from "@testing-library/user-event";

/*
 * For tests that read the Issues panel (`RosterIssuesList`), whose rows open
 * one at a time; never part of the app.
 */

/**
 * Every Issues row's text with its open part, opening each row in turn, one
 * line per row: what a test reads when it does not care which row says it.
 */
export const issueRowsText = async (
	user: ReturnType<typeof userEvent.setup>,
	panel: HTMLElement
): Promise<string> => {
	const rowButtons = within(panel)
		.getAllByRole("button", { expanded: false })
		.filter((button) => button.parentElement?.tagName === "LI");
	const texts: Array<string> = [];
	for (const button of rowButtons) {
		// One row opens at a time, so each is opened and read before the next.
		// eslint-disable-next-line no-await-in-loop
		await user.click(button);
		texts.push(button.parentElement?.textContent ?? "");
	}
	return texts.join("\n");
};
