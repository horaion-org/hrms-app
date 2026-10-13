import { render, screen } from "@testing-library/react";
import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import { beforeAll, describe, expect, it } from "vitest";
import en from "@/assets/locales/en/translations.json";
import { ConstraintTypeTag } from "@/features/scheduling/constraints/ConstraintTypeTag";

beforeAll(async () => {
	await createInstance()
		.use(initReactI18next)
		.init({ lng: "en", resources: { en: { translation: en } } });
});

describe("ConstraintTypeTag", () => {
	it("given_aCategory_when_rendered_then_namesItAndExplainsItOnHover", () => {
		render(<ConstraintTypeTag category="ROLE_COVERAGE" />);

		expect(screen.getByText("Role coverage").parentElement).toHaveAttribute(
			"title",
			"Which job titles must be present while a shift runs"
		);
	});

	it("given_twoCategories_when_rendered_then_colourKeysDiffer", () => {
		const { container } = render(
			<>
				<ConstraintTypeTag category="SHIFT_PATTERN" />
				<ConstraintTypeTag category="WORKING_HOURS" />
			</>
		);

		const [first, second] = container.querySelectorAll("[aria-hidden=true]");
		expect(first?.className).not.toBe(second?.className);
	});
});
