import { render, screen, within } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it } from "vitest";
import en from "@/assets/locales/en/translations.json";
import { PasswordRuleChecklist } from "@/features/auth/PasswordRuleChecklist";
import { authTestI18n } from "@/features/auth/testingI18n";

const copy = en.auth.changePassword;

const renderChecklist = (password: string, currentPassword: string): void => {
	render(
		<I18nextProvider i18n={authTestI18n}>
			<PasswordRuleChecklist
				currentPassword={currentPassword}
				id="rules"
				password={password}
			/>
		</I18nextProvider>
	);
};

const stateOf = (rule: string): string | null =>
	within(screen.getByRole("list", { name: copy.rulesLabel })).getByText(rule)
		.parentElement?.textContent ?? null;

describe("PasswordRuleChecklist", () => {
	it("reads every rule as not met before anything is typed", () => {
		renderChecklist("", "");

		for (const rule of Object.values(copy.rules))
			expect(stateOf(rule)).toContain(copy.ruleUnmet);
	});

	it("marks the rules the password meets", () => {
		renderChecklist("example1", "Current123!");

		expect(stateOf(copy.rules.length)).toContain(copy.ruleMet);
		expect(stateOf(copy.rules.lowercase)).toContain(copy.ruleMet);
		expect(stateOf(copy.rules.number)).toContain(copy.ruleMet);
		expect(stateOf(copy.rules.uppercase)).toContain(copy.ruleUnmet);
		expect(stateOf(copy.rules.symbol)).toContain(copy.ruleUnmet);
		expect(stateOf(copy.rules.different)).toContain(copy.ruleMet);
	});

	it("flags a new password equal to the current one", () => {
		renderChecklist("Current123!", "Current123!");

		expect(stateOf(copy.rules.different)).toContain(copy.ruleUnmet);
	});
});
