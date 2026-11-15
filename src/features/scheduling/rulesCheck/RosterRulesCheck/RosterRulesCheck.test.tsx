import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import { beforeAll, describe, expect, it, vi } from "vitest";
import en from "@/assets/locales/en/translations.json";
import { RosterRulesCheck } from "@/features/scheduling/rulesCheck/RosterRulesCheck";
import type {
	RosterRulesCheck as Check,
	StaffingGap,
} from "@/features/scheduling/rulesCheck/rosterRulesCheckApi";

beforeAll(async () => {
	await createInstance()
		.use(initReactI18next)
		.init({ lng: "en", resources: { en: { translation: en } } });
});

const SHORT_TUESDAY: StaffingGap = {
	date: "2026-11-10",
	message: "Front Desk AM is 1 short",
	missing: 1,
	constraintId: "k-2",
	constraintName: "Two at the desk",
};

/** Shows the panel answered with `check`. */
const answered = (check: Check): void => {
	render(<RosterRulesCheck check={{ status: "ready", check, ask: vi.fn() }} />);
};

/** The part under the given heading. */
const part = (title: string): HTMLElement =>
	screen.getByRole("heading", { name: title }).closest("section")!;

describe("RosterRulesCheck", () => {
	it("says it is validating while asking", () => {
		render(<RosterRulesCheck check={{ status: "loading", ask: vi.fn() }} />);

		expect(screen.getByText("Validating the schedule…")).toBeInTheDocument();
	});

	it("says no rule is broken and what was checked, apart from staffing that is short", () => {
		answered({
			status: "HOLDS",
			brokenRules: [],
			staffingGaps: [SHORT_TUESDAY],
		});

		const rules = part("Rules");
		expect(
			within(rules).getByText("No working-time rule is broken.")
		).toBeVisible();
		expect(
			within(rules).getByText(/^Checked: hours a day, overtime a month/)
		).toBeVisible();
		const staffing = part("Staffing");
		expect(within(staffing).getByText("Staffing is short:")).toBeVisible();
		expect(within(staffing).getByRole("listitem")).toHaveTextContent(
			/Nov.*· Front Desk AM is 1 short · Two at the desk$/
		);
	});

	it("says every shift is staffed, or that staffing could not be checked", () => {
		answered({ status: "HOLDS", brokenRules: [], staffingGaps: [] });
		expect(
			screen.getByText("Every shift is staffed as the rules ask.")
		).toBeVisible();
	});

	it("says staffing could not be checked when the engine could not work it out", () => {
		answered({ status: "HOLDS", brokenRules: [], staffingGaps: null });
		expect(screen.getByText("Staffing could not be checked.")).toBeVisible();
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
			staffingGaps: [],
		});

		const rules = part("Rules");
		expect(within(rules).getByText("This roster breaks:")).toBeVisible();
		expect(
			within(rules)
				.getAllByRole("listitem")
				.map((item) => item.textContent)
		).toEqual(["Twelve hours", "Most days a week", "A working-time rule"]);
	});

	it("says a rule is broken when the engine named none, and that rules could not be checked", () => {
		const { unmount } = render(
			<RosterRulesCheck
				check={{
					status: "ready",
					check: { status: "BROKEN", brokenRules: [], staffingGaps: [] },
					ask: vi.fn(),
				}}
			/>
		);
		expect(
			screen.getByText("This roster breaks a working-time rule.")
		).toBeVisible();
		unmount();

		answered({ status: "UNCHECKED", brokenRules: [], staffingGaps: null });
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
