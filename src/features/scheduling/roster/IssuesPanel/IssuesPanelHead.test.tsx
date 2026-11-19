import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it, vi } from "vitest";
import { authTestI18n } from "@/features/auth/testingI18n";
import type { CheckLine } from "@/features/scheduling/rulesCheck/checkLine";
import { IssuesPanelHead } from "./IssuesPanelHead";

/** The head with `line`, `mustFix` rows to fix; gives the check's action. */
const show = (line: CheckLine | undefined, mustFix = 3): (() => void) => {
	const onCheck = vi.fn();
	render(
		<I18nextProvider i18n={authTestI18n}>
			<IssuesPanelHead checkLine={line} mustFix={mustFix} onCheck={onCheck} />
		</I18nextProvider>
	);
	return onCheck;
};

describe("IssuesPanelHead", () => {
	it("given_aCheckAtTheRevisionOnScreen_when_checkAgainIsPressed_then_theCheckRunsAgain", async () => {
		const user = userEvent.setup();
		const onCheck = show({
			state: "checked",
			checkedAt: new Date(2026, 10, 19, 15, 42).getTime(),
			incomplete: false,
		});

		expect(screen.getByText("3 to fix")).toBeVisible();
		expect(screen.getByText(/^Checked 15:42/)).toBeVisible();
		await user.click(screen.getByRole("button", { name: "Check again" }));

		expect(onCheck).toHaveBeenCalledOnce();
	});

	it.each<[string, CheckLine, string, string | undefined]>([
		["running", { state: "checking" }, "Checking the rules…", undefined],
		["unchecked", { state: "unchecked" }, "Not checked since your changes", "Check now"],
		["as generated", { state: "asGenerated" }, "As generated", "Check"],
		[
			"refused for now",
			{ state: "refused", refusal: "tooSlow", canRetry: true },
			"The engine took too long this time, so the schedule wasn’t validated.",
			"Try again",
		],
		[
			"refused for good",
			{ state: "refused", refusal: "expired", canRetry: false },
			"The engine no longer holds this week’s generation",
			undefined,
		],
	])("given_a check %s_when_shown_then_saysSoWithItsAction", (_case, line, text, action) => {
		show(line, 0);

		expect(screen.queryByText(/to fix/)).toBeNull();
		expect(screen.getByText(new RegExp(`^${text}`))).toBeVisible();
		if (action) expect(screen.getByRole("button", { name: action })).toBeVisible();
		else expect(screen.queryByRole("button")).toBeNull();
	});

	it("given_someoneWhoMayNotRunTheCheck_when_shown_then_onlyTheCount", () => {
		show(undefined);

		expect(screen.getByText("3 to fix")).toBeVisible();
		expect(screen.queryByRole("button")).toBeNull();
	});
});
