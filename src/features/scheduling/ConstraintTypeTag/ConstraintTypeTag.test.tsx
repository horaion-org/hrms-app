import { render, screen } from "@testing-library/react";
import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import { beforeAll, describe, expect, it } from "vitest";
import en from "@/assets/locales/en/translations.json";
import { ConstraintTypeTag } from "@/features/scheduling/ConstraintTypeTag";

beforeAll(async () => {
	await createInstance()
		.use(initReactI18next)
		.init({ lng: "en", resources: { en: { translation: en } } });
});

describe("ConstraintTypeTag", () => {
	it("given_aType_when_rendered_then_namesItAndExplainsItOnHover", () => {
		render(<ConstraintTypeTag type="ROLE_COVERAGE" />);

		expect(screen.getByText("Role Coverage").parentElement).toHaveAttribute(
			"title",
			"Required roles / seniority"
		);
	});

	it("given_twoTypes_when_rendered_then_colourKeysDiffer", () => {
		const { container } = render(
			<>
				<ConstraintTypeTag type="SHIFT_PATTERN" />
				<ConstraintTypeTag type="WORKING_HOURS" />
			</>
		);

		const [first, second] = container.querySelectorAll("[aria-hidden=true]");
		expect(first?.className).not.toBe(second?.className);
	});
});
