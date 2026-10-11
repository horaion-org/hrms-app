import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import { beforeAll, describe, expect, it, vi } from "vitest";
import en from "@/assets/locales/en/translations.json";
import { ColourSwatchPicker } from "@/components/forms/ColourSwatchPicker";

beforeAll(async () => {
	await createInstance()
		.use(initReactI18next)
		.init({ lng: "en", resources: { en: { translation: en } } });
});

const colours = ["#C16A45", "#E0A165", "#6F9478"];

describe("ColourSwatchPicker", () => {
	it("given_aValue_when_rendered_then_checksOnlyThatColour", () => {
		render(
			<ColourSwatchPicker
				colours={colours}
				value="#E0A165"
				onChange={vi.fn()}
			/>
		);

		expect(screen.getAllByRole("radio")).toHaveLength(3);
		expect(screen.getByRole("radio", { name: "Colour #E0A165" })).toBeChecked();
		expect(
			screen.getByRole("radio", { name: "Colour #C16A45" })
		).not.toBeChecked();
	});

	it("given_aTile_when_clicked_then_reportsItsColour", async () => {
		const user = userEvent.setup();
		const onChange = vi.fn();
		render(
			<ColourSwatchPicker
				colours={colours}
				value="#E0A165"
				onChange={onChange}
			/>
		);

		await user.click(screen.getByRole("radio", { name: "Colour #6F9478" }));

		expect(onChange).toHaveBeenCalledWith("#6F9478");
	});

	it("given_aLabelledGroup_when_rendered_then_isNamedAndUsesCustomLabels", () => {
		render(
			<>
				<span id="label">Shift Colour</span>
				<ColourSwatchPicker
					aria-labelledby="label"
					colourLabel={(colour) => `Tile ${colour}`}
					colours={colours}
					value="#E0A165"
					onChange={vi.fn()}
				/>
			</>
		);

		expect(
			screen.getByRole("group", { name: "Shift Colour" })
		).toBeInTheDocument();
		expect(
			screen.getByRole("radio", { name: "Tile #C16A45" })
		).toBeInTheDocument();
	});

	it("given_disabled_when_rendered_then_everyTileIsDisabled", () => {
		render(
			<ColourSwatchPicker
				disabled
				colours={colours}
				value="#E0A165"
				onChange={vi.fn()}
			/>
		);

		for (const radio of screen.getAllByRole("radio"))
			expect(radio).toBeDisabled();
	});
});
