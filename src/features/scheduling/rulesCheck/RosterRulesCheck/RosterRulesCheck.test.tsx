import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import { beforeAll, describe, expect, it, vi } from "vitest";
import en from "@/assets/locales/en/translations.json";
import { RosterRulesCheck } from "@/features/scheduling/rulesCheck/RosterRulesCheck";
import type { RosterRulesCheck as Check } from "@/features/scheduling/rulesCheck/rosterRulesCheckApi";

beforeAll(async () => {
	await createInstance()
		.use(initReactI18next)
		.init({ lng: "en", resources: { en: { translation: en } } });
});

/** Shows the section answered with `check`. */
const answered = (check: Check): void => {
	render(<RosterRulesCheck check={{ status: "ready", check, ask: vi.fn() }} />);
};

describe("RosterRulesCheck", () => {
	it("checks only when the button is pressed", async () => {
		const ask = vi.fn();
		render(<RosterRulesCheck check={{ status: "idle", ask }} />);

		await userEvent.click(screen.getByRole("button", { name: "Check rules" }));

		expect(ask).toHaveBeenCalledOnce();
	});

	it("says it is checking", () => {
		render(<RosterRulesCheck check={{ status: "loading", ask: vi.fn() }} />);

		expect(screen.getByText("Checking the rules…")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Check rules" })).toBeDisabled();
	});

	it("says every rule holds", () => {
		answered({ status: "HOLDS", brokenRules: [] });

		expect(screen.getByText("Every working-time rule holds.")).toBeVisible();
	});

	it("lists each broken rule by its constraint's name, else its label, else a generic line", () => {
		answered({
			status: "BROKEN",
			brokenRules: [
				{
					rule: "most_minutes_a_day",
					constraintId: "k-1",
					constraintName: "Twelve hours",
				},
				{ rule: "most_days_a_week", constraintId: null, constraintName: null },
				{
					rule: "a_rule_added_later",
					constraintId: null,
					constraintName: null,
				},
			],
		});

		expect(screen.getByText("This roster breaks:")).toBeVisible();
		expect(
			screen.getAllByRole("listitem").map((item) => item.textContent)
		).toEqual(["Twelve hours", "Most days a week", "A working-time rule"]);
	});

	it("says a rule is broken when the engine named none", () => {
		answered({ status: "BROKEN", brokenRules: [] });

		expect(
			screen.getByText("This roster breaks a working-time rule.")
		).toBeVisible();
	});

	it("says the rules could not be checked", () => {
		answered({ status: "UNCHECKED", brokenRules: [] });

		expect(screen.getByText("The rules could not be checked.")).toBeVisible();
	});

	it("says why it was refused, and offers to ask again only when the engine failed", async () => {
		const ask = vi.fn();
		const { rerender } = render(
			<RosterRulesCheck
				check={{ status: "refused", refusal: "expired", ask }}
			/>
		);
		expect(screen.getByRole("alert")).toHaveTextContent(
			"The engine no longer holds this week’s generation."
		);
		expect(screen.queryByRole("button", { name: "Try again" })).toBeNull();

		rerender(
			<RosterRulesCheck check={{ status: "refused", refusal: "failed", ask }} />
		);
		await userEvent.click(screen.getByRole("button", { name: "Try again" }));
		expect(ask).toHaveBeenCalledOnce();
	});
});
