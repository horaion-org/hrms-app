import { render, screen } from "@testing-library/react";
import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import { beforeAll, describe, expect, it } from "vitest";
import en from "@/assets/locales/en/translations.json";
import { PriorityIndicator } from "@/features/scheduling/PriorityIndicator";

beforeAll(async () => {
	await createInstance()
		.use(initReactI18next)
		.init({ lng: "en", resources: { en: { translation: en } } });
});

describe("PriorityIndicator", () => {
	it.each([
		["HIGH", "High"],
		["MEDIUM", "Medium"],
		["LOW", "Low"],
	] as const)("given_%s_when_rendered_then_readsAs%s", (priority, text) => {
		const { container } = render(<PriorityIndicator priority={priority} />);

		expect(container).toHaveTextContent(text);
		expect(screen.queryByRole("img")).toBeNull();
	});
});
