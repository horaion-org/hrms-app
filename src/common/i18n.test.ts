import i18n from "i18next";
import { beforeAll, describe, expect, it } from "vitest";
import "@/common/i18n";

describe("i18n", () => {
	beforeAll(async () => {
		// Pin the language so the browser detector's guess doesn't matter.
		await i18n.changeLanguage("en");
	});

	it("serves the bundled translations without fetching them", () => {
		expect(i18n.hasResourceBundle("en", "translations")).toBe(true);
		expect(i18n.hasResourceBundle("es", "translations")).toBe(true);
		expect(i18n.t("notifications.title", { lng: "en" })).toBe(
			"Notifications"
		);
	});

	it("resolves a regional browser language to its base language", async () => {
		await i18n.changeLanguage("en-US");

		expect(i18n.resolvedLanguage).toBe("en");
		expect(i18n.t("notifications.title")).toBe("Notifications");
	});

	it("falls back to English for an unsupported language", async () => {
		await i18n.changeLanguage("fr-FR");

		expect(i18n.resolvedLanguage).toBe("en");
		expect(i18n.t("notifications.title")).toBe("Notifications");
	});
});
