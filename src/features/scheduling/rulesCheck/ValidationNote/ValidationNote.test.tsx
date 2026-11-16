import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import { beforeAll, describe, expect, it, vi } from "vitest";
import en from "@/assets/locales/en/translations.json";
import { rulesCheckFixture } from "@/features/scheduling/rulesCheck/fixtures";
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
				validation={{ status: "idle", ask: vi.fn() }}
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

		expect(screen.getByText(copy.outOfDate)).toBeInTheDocument();
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

	it("says the list is the schedule as it stands once validated", () => {
		show("current", { last: { revision: 1, check: rulesCheckFixture() } });

		expect(screen.getByText(copy.validated)).toBeInTheDocument();
	});

	it("says a check that ran out of time may be incomplete, and validates again", async () => {
		const check = rulesCheckFixture({ mayBeShort: true });
		const ask = show("current", {
			status: "ready",
			check,
			last: { revision: 1, check },
		});

		expect(screen.getByText(copy.mayBeShort)).toBeVisible();
		await userEvent.click(
			screen.getByRole("button", { name: copy.validateAgain })
		);

		expect(ask).toHaveBeenCalledOnce();
	});
});
