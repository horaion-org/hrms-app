import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import { beforeAll, describe, expect, it, vi } from "vitest";
import en from "@/assets/locales/en/translations.json";
import { ChosenConstraintType } from "@/features/scheduling/constraints/ChosenConstraintType";

beforeAll(async () => {
	await createInstance()
		.use(initReactI18next)
		.init({ lng: "en", resources: { en: { translation: en } } });
});

describe("ChosenConstraintType", () => {
	it("given_aKind_when_rendered_then_namesItAndWhatItDoes_andChangeGoesBack", async () => {
		const user = userEvent.setup();
		const onChange = vi.fn();
		render(<ChosenConstraintType type="SHIFT_STAFFING" onChange={onChange} />);

		expect(screen.getByText("People on a shift")).toBeVisible();
		expect(
			screen.getByText("How many people a shift needs, by job title.")
		).toBeVisible();
		await user.click(
			screen.getByRole("button", {
				name: "Change what it decides: People on a shift",
			})
		);
		expect(onChange).toHaveBeenCalled();
	});

	it("given_aKindThatCantChange_when_rendered_then_saysWhyAndOffersNoChange", () => {
		render(
			<ChosenConstraintType
				note="It can’t be changed."
				type="REST_BETWEEN_SHIFTS"
			/>
		);

		expect(screen.getByText("It can’t be changed.")).toBeVisible();
		expect(screen.queryByRole("button")).toBeNull();
	});
});
