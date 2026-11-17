import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import { beforeAll, describe, expect, it, vi } from "vitest";
import en from "@/assets/locales/en/translations.json";
import {
	ruleFixture,
	rulesCheckFixture,
} from "@/features/scheduling/rulesCheck/fixtures";
import type { ValidationStanding } from "@/features/scheduling/rulesCheck/issuesFromValidation";
import type { RosterValidation } from "@/features/scheduling/rulesCheck/useRosterRulesCheck";
import { ValidationNote } from "@/features/scheduling/rulesCheck/ValidationNote";

/*
 * The note's copy is read from the English file, so these tests pin which
 * line shows in each state, not its wording.
 */
const copy = en.scheduling.rulesCheck;

beforeAll(async () => {
	await createInstance()
		.use(initReactI18next)
		.init({ lng: "en", resources: { en: { translation: en } } });
});

/** The note for `standing` and `validation`; returns the ask it was given. */
const show = (
	standing: ValidationStanding,
	validation: Partial<RosterValidation> = {}
): ReturnType<typeof vi.fn> => {
	const ask = vi.fn();
	render(
		<ValidationNote
			standing={standing}
			validation={{ status: "idle", ask, ...validation } as RosterValidation}
		/>
	);
	return ask;
};

describe("ValidationNote", () => {
	it("shows nothing while the list is still the generation's", () => {
		const { container } = render(
			<ValidationNote
				standing="asGenerated"
				validation={{ status: "idle", ask: vi.fn(), revision: 0 }}
			/>
		);

		expect(container).toBeEmptyDOMElement();
	});

	it("says the schedule is being validated", () => {
		show("current", { status: "loading" });

		expect(screen.getByText(copy.loading)).toBeInTheDocument();
	});

	it.each(["failed", "tooSlow"] as const)(
		"offers to try again when refused as %s",
		async (refusal) => {
			const ask = show("current", { status: "refused", refusal });

			expect(screen.getByRole("alert")).toHaveTextContent(
				copy.refusal[refusal]
			);
			await userEvent.click(
				screen.getByRole("button", { name: en.scheduling.rosterEdit.tryAgain })
			);
			expect(ask).toHaveBeenCalledOnce();
		}
	);

	it.each(["expired", "notConnected", "rosterMoved"] as const)(
		"says why when refused as %s, with nothing to retry",
		(refusal) => {
			show("current", { status: "refused", refusal });

			expect(screen.getByRole("alert")).toHaveTextContent(
				copy.refusal[refusal]
			);
			expect(screen.queryByRole("button")).not.toBeInTheDocument();
		}
	);

	it("says the list is out of date, with Validate schedule right there", async () => {
		const ask = show("outOfDate");

		expect(screen.getByRole("note")).toHaveTextContent(copy.outOfDate);
		expect(screen.getByRole("note")).toHaveClass("bg-ink-blue-50");
		await userEvent.click(screen.getByRole("button", { name: copy.check }));
		expect(ask).toHaveBeenCalledOnce();
	});

	it("says what the engine could not check", () => {
		show("current", {
			last: {
				revision: 1,
				check: rulesCheckFixture({ status: "UNCHECKED", staffingGaps: null }),
			},
		});

		expect(screen.getByText(copy.rulesUnchecked)).toBeInTheDocument();
		expect(screen.getByText(copy.staffingUnchecked)).toBeInTheDocument();
	});

	it("says no rule is broken once validated, in the success tone", () => {
		show("current", { last: { revision: 1, check: rulesCheckFixture() } });

		expect(screen.getByRole("note")).toHaveTextContent(copy.validated);
		expect(screen.getByRole("note")).toHaveClass("bg-success-50");
	});

	it("says a check that ran out of time may be incomplete, and validates again", async () => {
		const check = rulesCheckFixture({ mayBeShort: true });
		const ask = show("current", {
			status: "ready",
			check,
			last: { revision: 1, check },
		});

		expect(screen.getByText(copy.mayBeShort)).toBeVisible();
		expect(screen.getByRole("note")).toHaveClass("bg-warning-50");
		await userEvent.click(
			screen.getByRole("button", { name: copy.validateAgain })
		);

		expect(ask).toHaveBeenCalledOnce();
	});

	it("counts the rules a broken schedule breaks, in the error tone", () => {
		show("current", {
			last: {
				revision: 1,
				check: rulesCheckFixture({
					status: "BROKEN",
					brokenRules: [
						ruleFixture({ constraintName: "Twelve hours a day" }),
						ruleFixture({ constraintName: "Rest between shifts" }),
					],
				}),
			},
		});

		expect(screen.getByRole("note")).toHaveTextContent(
			"Validated: 2 rules broken"
		);
		expect(screen.getByRole("note")).toHaveClass("bg-error-50");
	});

	it("counts a broken schedule with no rule named as one rule broken", () => {
		show("current", {
			last: {
				revision: 1,
				check: rulesCheckFixture({ status: "BROKEN", brokenRules: [] }),
			},
		});

		expect(screen.getByRole("note")).toHaveTextContent(
			"Validated: 1 rule broken"
		);
	});
});
