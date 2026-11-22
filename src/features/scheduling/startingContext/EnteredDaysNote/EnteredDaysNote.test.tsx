import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import { beforeAll, describe, expect, it, vi } from "vitest";
import en from "@/assets/locales/en/translations.json";
import { EnteredDaysNote } from "@/features/scheduling/startingContext/EnteredDaysNote";

beforeAll(async () => {
	await createInstance()
		.use(initReactI18next)
		.init({ lng: "en", resources: { en: { translation: en } } });
});

describe("EnteredDaysNote", () => {
	it("given_peopleWithEnteredDays_when_showThemChosen_then_showsTheirWeek", async () => {
		const user = userEvent.setup();
		const onShowWeek = vi.fn();
		render(<EnteredDaysNote count={3} onShowWeek={onShowWeek} />);

		expect(
			screen.getByText(
				/3 people have shifts entered for the days before these days\./
			)
		).toBeInTheDocument();
		await user.click(screen.getByRole("button", { name: "Show them" }));
		expect(onShowWeek).toHaveBeenCalledOnce();
	});

	it("given_nobody_when_rendered_then_saysNothing", () => {
		const { container } = render(
			<EnteredDaysNote count={0} onShowWeek={vi.fn()} />
		);

		expect(container).toBeEmptyDOMElement();
	});
});
