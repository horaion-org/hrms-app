import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import { beforeAll, describe, expect, it, vi } from "vitest";
import en from "@/assets/locales/en/translations.json";
import { staffingGapFixture } from "@/features/scheduling/rulesCheck/fixtures";
import type { RosterRulesCheck } from "@/features/scheduling/rulesCheck/rosterRulesCheckApi";
import { ValidateScheduleButton } from "@/features/scheduling/rulesCheck/ValidateScheduleButton";

beforeAll(async () => {
	await createInstance()
		.use(initReactI18next)
		.init({ lng: "en", resources: { en: { translation: en } } });
});

const CLEAN: RosterRulesCheck = {
	status: "HOLDS",
	brokenRules: [],
	staffingGaps: [],
};
const TWO_PROBLEMS: RosterRulesCheck = {
	status: "BROKEN",
	brokenRules: [
		{ rule: "most_minutes_a_day", constraintId: null, constraintName: null },
	],
	staffingGaps: [staffingGapFixture()],
};

/** The button at `revision`, with the given last validation and changes. */
const show = (
	props: Partial<Parameters<typeof ValidateScheduleButton>[0]> = {}
): ReturnType<typeof vi.fn> => {
	const onClick = vi.fn();
	render(
		<ValidateScheduleButton
			hasChanges={false}
			open={false}
			panelId="panel"
			revision={2}
			onClick={onClick}
			{...props}
		/>
	);
	return onClick;
};

describe("ValidateScheduleButton", () => {
	it("is plain on a roster never changed or validated, and opens its panel", async () => {
		const onClick = show();

		const button = screen.getByRole("button", { name: "Validate schedule" });
		expect(button.className).not.toBe("");
		await userEvent.click(button);

		expect(onClick).toHaveBeenCalledWith(button);
	});

	it("lights up, saying so, once the roster changed and was never validated", () => {
		show({ hasChanges: true });

		expect(
			screen.getByRole("button", {
				name: "Validate schedule: the schedule changed since it was last validated",
			})
		).toBeVisible();
	});

	it("lights up once the roster moved on since its last validation", () => {
		show({ last: { revision: 1, check: CLEAN } });

		expect(
			screen.getByRole("button", {
				name: /changed since it was last validated/,
			})
		).toBeVisible();
	});

	it("is plain again after validating the roster on screen, naming the problems but showing no second count", () => {
		show({ hasChanges: true, last: { revision: 2, check: TWO_PROBLEMS } });

		const button = screen.getByRole("button", {
			name: "Validate schedule: 2 problems found",
		});
		expect(button).toHaveTextContent(/^Validate schedule$/);
	});

	it("shows a tick when the roster on screen has no problems", () => {
		show({ hasChanges: true, last: { revision: 2, check: CLEAN } });

		expect(
			screen.getByRole("button", {
				name: "Validate schedule: no problems found",
			})
		).toBeVisible();
	});
});
