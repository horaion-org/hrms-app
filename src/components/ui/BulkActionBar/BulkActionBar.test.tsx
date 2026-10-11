import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import { beforeAll, describe, expect, it, vi } from "vitest";
import en from "@/assets/locales/en/translations.json";
import { BulkActionBar } from "@/components/ui/BulkActionBar";

beforeAll(async () => {
	await createInstance()
		.use(initReactI18next)
		.init({ lng: "en", resources: { en: { translation: en } } });
});

describe("BulkActionBar", () => {
	it("given_aSelection_when_rendered_then_saysHowManyAndOffersTheActions", () => {
		render(
			<BulkActionBar summary="2 employees selected" onClear={vi.fn()}>
				<button type="button">Export Selected</button>
			</BulkActionBar>
		);

		expect(screen.getByText("2 employees selected")).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Export Selected" })
		).toBeInTheDocument();
	});

	it("given_clearClicked_when_rendered_then_asksToClear", async () => {
		const user = userEvent.setup();
		const onClear = vi.fn();
		render(
			<BulkActionBar summary="2 employees selected" onClear={onClear}>
				<button type="button">Export Selected</button>
			</BulkActionBar>
		);

		await user.click(screen.getByRole("button", { name: "Clear selection" }));

		expect(onClear).toHaveBeenCalled();
	});
});
