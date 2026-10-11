import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createInstance } from "i18next";
import { useState } from "react";
import { initReactI18next } from "react-i18next";
import { beforeAll, describe, expect, it, vi } from "vitest";
import en from "@/assets/locales/en/translations.json";
import type { FunctionComponent } from "@/common/types";
import { NumberStepper } from "@/components/forms/NumberStepper";

beforeAll(async () => {
	await createInstance()
		.use(initReactI18next)
		.init({ lng: "en", resources: { en: { translation: en } } });
});

const Counter = ({ initial = 1 }: { initial?: number }): FunctionComponent => {
	const [value, setValue] = useState(initial);
	return (
		<NumberStepper
			label="Prep Cook"
			max={3}
			value={value}
			onChange={setValue}
		/>
	);
};

describe("NumberStepper", () => {
	it("given_aLabel_when_rendered_then_namesTheGroupAndItsButtons", () => {
		render(<Counter />);

		expect(screen.getByRole("group", { name: "Prep Cook" })).toHaveTextContent(
			"1"
		);
		expect(
			screen.getByRole("button", { name: "Fewer Prep Cook" })
		).toBeEnabled();
		expect(
			screen.getByRole("button", { name: "More Prep Cook" })
		).toBeEnabled();
	});

	it("given_plusAndMinus_when_clicked_then_stepsTheValue", async () => {
		const user = userEvent.setup();
		render(<Counter />);

		await user.click(screen.getByRole("button", { name: "More Prep Cook" }));
		await user.click(screen.getByRole("button", { name: "More Prep Cook" }));
		expect(screen.getByRole("status")).toHaveTextContent("3");

		await user.click(screen.getByRole("button", { name: "Fewer Prep Cook" }));
		expect(screen.getByRole("status")).toHaveTextContent("2");
	});

	it("given_theMinimum_when_rendered_then_disablesMinus", () => {
		render(<Counter initial={0} />);

		expect(
			screen.getByRole("button", { name: "Fewer Prep Cook" })
		).toBeDisabled();
	});

	it("given_theMaximum_when_rendered_then_disablesPlus", () => {
		render(<Counter initial={3} />);

		expect(
			screen.getByRole("button", { name: "More Prep Cook" })
		).toBeDisabled();
	});

	it("given_disabled_when_rendered_then_neitherButtonReports", async () => {
		const user = userEvent.setup();
		const onChange = vi.fn();
		render(
			<NumberStepper disabled label="Cashier" value={2} onChange={onChange} />
		);

		await user.click(screen.getByRole("button", { name: "More Cashier" }));

		expect(onChange).not.toHaveBeenCalled();
	});
});
