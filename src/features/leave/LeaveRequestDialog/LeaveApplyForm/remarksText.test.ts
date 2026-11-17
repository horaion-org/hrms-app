import { createInstance, type TFunction } from "i18next";
import { beforeAll, describe, expect, it } from "vitest";
import en from "@/assets/locales/en/translations.json";
import { remarksText } from "./remarksText";

let t: TFunction;
beforeAll(async () => {
	const i18n = createInstance();
	await i18n.init({ lng: "en", resources: { en: { translation: en } } });
	t = i18n.t;
});

describe("remarksText", () => {
	it("asks a reviewer recording leave for a remark the employee will see", () => {
		expect(remarksText(t, true, true)).toMatchObject({
			label: "Remark",
			missing:
				"Enter a remark that says why this leave is recorded. The employee will see it.",
		});
	});

	it("asks an applicant for the reason when the leave type requires one", () => {
		expect(remarksText(t, false, true)).toMatchObject({
			label: "Reason",
			missing: "Enter what this leave is for.",
		});
	});

	it("offers optional remarks with no message for an empty field", () => {
		const text = remarksText(t, false, false);
		expect(text.label).toBe("Remarks (optional)");
		expect(text.missing).toBeUndefined();
	});
});
