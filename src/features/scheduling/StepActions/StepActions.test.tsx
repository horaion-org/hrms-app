import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import { beforeAll, describe, expect, it, vi } from "vitest";
import en from "@/assets/locales/en/translations.json";
import { ArrowRightIcon } from "@/components/ui/Icon";
import { StepActions } from "@/features/scheduling/StepActions";

beforeAll(async () => {
	await createInstance()
		.use(initReactI18next)
		.init({ lng: "en", resources: { en: { translation: en } } });
});

const NOTE = "Saving drafts and generating schedules aren’t available yet.";

describe("StepActions", () => {
	it("given_theFirstStep_when_rendered_then_showsOnlyNext", async () => {
		const user = userEvent.setup();
		const onNext = vi.fn();
		render(
			<StepActions
				nextIcon={<ArrowRightIcon />}
				nextLabel="Next"
				unavailableNote={NOTE}
				onNext={onNext}
			/>
		);

		expect(screen.queryByRole("button", { name: "Back" })).toBeNull();
		expect(screen.queryByRole("button", { name: "Save Draft" })).toBeNull();
		expect(screen.queryByText(NOTE)).toBeNull();
		await user.click(screen.getByRole("button", { name: "Next" }));
		expect(onNext).toHaveBeenCalledOnce();
	});

	it("given_aLaterStep_when_backClicked_then_returns", async () => {
		const user = userEvent.setup();
		const onBack = vi.fn();
		render(
			<StepActions
				saveDraft
				nextIcon={<ArrowRightIcon />}
				nextLabel="Next"
				unavailableNote={NOTE}
				onBack={onBack}
			/>
		);

		await user.click(screen.getByRole("button", { name: "Back" }));

		expect(onBack).toHaveBeenCalledOnce();
	});

	it("given_saveDraft_when_rendered_then_isDisabledAndSaysWhy", () => {
		render(
			<StepActions
				saveDraft
				nextIcon={<ArrowRightIcon />}
				nextLabel="Next"
				unavailableNote={NOTE}
			/>
		);

		const save = screen.getByRole("button", { name: "Save Draft" });
		expect(save).toBeDisabled();
		expect(save).toHaveAccessibleDescription(NOTE);
	});

	it("given_aForm_when_rendered_then_nextSubmitsIt", () => {
		render(
			<StepActions
				form="setup-form"
				nextIcon={<ArrowRightIcon />}
				nextLabel="Next"
				unavailableNote={NOTE}
			/>
		);

		const next = screen.getByRole("button", { name: "Next" });
		expect(next).toHaveAttribute("type", "submit");
		expect(next).toHaveAttribute("form", "setup-form");
	});

	it("given_nextDisabled_when_rendered_then_describesItWithTheNote", () => {
		render(
			<StepActions
				nextDisabled
				saveDraft
				nextIcon={<ArrowRightIcon />}
				nextLabel="Generate"
				unavailableNote={NOTE}
			/>
		);

		expect(
			screen.getByRole("button", { name: "Generate" })
		).toHaveAccessibleDescription(NOTE);
	});
});
