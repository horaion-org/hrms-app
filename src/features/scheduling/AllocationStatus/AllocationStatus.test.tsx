import { render, screen } from "@testing-library/react";
import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import { beforeAll, describe, expect, it } from "vitest";
import en from "@/assets/locales/en/translations.json";
import { AllocationStatus } from "@/features/scheduling/AllocationStatus";

beforeAll(async () => {
	await createInstance()
		.use(initReactI18next)
		.init({ lng: "en", resources: { en: { translation: en } } });
});

describe("AllocationStatus", () => {
	it.each([
		[4, 4, "complete"],
		[2, 3, "short"],
		[7, 6, "over"],
	])(
		"given_%i_of_%i_when_rendered_then_reads_and_is_%s",
		(allocated, needed, status) => {
			render(<AllocationStatus allocated={allocated} needed={needed} />);

			const text = screen.getByText(`${allocated}/${needed} staff allocated`);
			expect(text).toHaveAttribute("data-status", status);
		}
	);
});
