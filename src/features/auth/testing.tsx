import { render, type RenderResult } from "@testing-library/react";
import { createInstance } from "i18next";
import type { ReactNode } from "react";
import { I18nextProvider, initReactI18next } from "react-i18next";
import en from "@/assets/locales/en/translations.json";
import { MemoryRouterHarness } from "@/components/utils/MemoryRouterHarness";

const i18n = createInstance();
void i18n.use(initReactI18next).init({
	lng: "en",
	resources: { en: { translation: en } },
});

/** Renders an auth page inside a memory router with English translations. */
export const renderAuthPage = (
	page: ReactNode,
	initialEntry = "/"
): RenderResult =>
	render(
		<I18nextProvider i18n={i18n}>
			<MemoryRouterHarness initialEntry={initialEntry}>
				{page}
			</MemoryRouterHarness>
		</I18nextProvider>
	);
